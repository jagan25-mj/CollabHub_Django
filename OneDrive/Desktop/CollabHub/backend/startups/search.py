"""
Search compatibility layer for PostgreSQL/SQLite support.

This module provides a unified search interface that automatically detects
the database backend and uses the appropriate search method:

- PostgreSQL: Full-text search (FTS) with trigram similarity
- SQLite: Python-based fuzzy matching with Levenshtein distance

This ensures search works consistently across development (SQLite) and
production (PostgreSQL) environments.
"""

from django.db import connection
from django.db.models import Q, F, Value, CharField, FloatField
from django.db.models.functions import Greatest, Coalesce
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, TrigramSimilarity

from difflib import SequenceMatcher


def is_postgres():
    """Check if using PostgreSQL backend."""
    return 'postgresql' in connection.settings_dict.get('ENGINE', '').lower()


def is_sqlite():
    """Check if using SQLite backend."""
    return 'sqlite' in connection.settings_dict.get('ENGINE', '').lower()


def calculate_similarity(a: str, b: str) -> float:
    """
    Calculate string similarity using SequenceMatcher.
    
    Returns float between 0.0 and 1.0, where 1.0 is perfect match.
    """
    if not a or not b:
        return 0.0
    a_lower = a.lower()
    b_lower = b.lower()
    return SequenceMatcher(None, a_lower, b_lower).ratio()


def sqlite_search_startups(queryset, search_query):
    """
    SQLite search implementation using Python fuzzy matching.
    
    Falls back to partial matching if exact substring not found.
    Score = (name_match * 0.5) + (tagline_match * 0.3) + (desc_match * 0.2)
    
    Args:
        queryset: Django queryset of Startup objects
        search_query: String to search for
        
    Returns:
        Sorted list of (startup, score) tuples, filtered by minimum threshold
    """
    results = []
    min_score = 0.15  # Minimum similarity threshold
    search_lower = search_query.lower()
    
    for startup in queryset:
        name_sim = calculate_similarity(startup.name, search_query)
        tagline_sim = calculate_similarity(
            startup.tagline or '', search_query
        )
        desc_sim = calculate_similarity(
            startup.description or '', search_query
        )
        
        # Weighted score
        score = (name_sim * 0.5) + (tagline_sim * 0.3) + (desc_sim * 0.2)
        
        # Boost exact substring matches
        if search_lower in startup.name.lower():
            score = min(1.0, score + 0.3)
        if search_lower in (startup.tagline or '').lower():
            score = min(1.0, score + 0.2)
        
        if score >= min_score:
            results.append((startup, score))
    
    # Sort by score (descending), then by name
    results.sort(key=lambda x: (-x[1], x[0].name))
    return results


def postgres_search_startups(queryset, search_query):
    """
    PostgreSQL search implementation using full-text search (FTS).
    
    Combines FTS with trigram similarity for best results.
    Fields weighted: name=A (most important), tagline=B, industry=B, desc=C
    
    Args:
        queryset: Django queryset of Startup objects
        search_query: String to search for
        
    Returns:
        Queryset annotated with rank and similarity scores
    """
    search_vector = (
        SearchVector('name', weight='A') +
        SearchVector('tagline', weight='B') +
        SearchVector('industry', weight='B') +
        SearchVector('description', weight='C')
    )
    
    search_obj = SearchQuery(search_query, search_type='websearch')
    
    return queryset.annotate(
        search=search_vector,
        rank=SearchRank(search_vector, search_obj),
        similarity=TrigramSimilarity('name', search_query)
    ).filter(
        Q(search=search_obj) | Q(similarity__gt=0.1)
    ).order_by('-rank', '-similarity', '-created_at')


def search_startups(queryset, search_query):
    """
    Unified search interface - automatically selects best backend.
    
    PostgreSQL: Uses FTS with trigram similarity
    SQLite: Uses Python fuzzy matching with string similarity
    
    Args:
        queryset: Django queryset of Startup objects
        search_query: String to search for
        
    Returns:
        QuerySet (PostgreSQL) or list of Startup objects (SQLite)
    """
    if not search_query or not search_query.strip():
        return queryset
    
    try:
        if is_postgres():
            return postgres_search_startups(queryset, search_query)
        elif is_sqlite():
            # SQLite: must evaluate queryset first
            startups = list(queryset)
            results = sqlite_search_startups(startups, search_query)
            return [startup for startup, _ in results]
        else:
            # Unknown backend, use basic LIKE
            return queryset.filter(
                Q(name__icontains=search_query) |
                Q(tagline__icontains=search_query) |
                Q(description__icontains=search_query)
            )
    except Exception as e:
        # Fallback on any error
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f'Search fallback triggered due to error: {e}')
        return queryset.filter(
            Q(name__icontains=search_query) |
            Q(tagline__icontains=search_query)
        )


def get_search_backend_info():
    """
    Get information about current search backend.
    
    Returns:
        dict with 'backend' (name), 'fts_available', 'approximate_matching'
    """
    if is_postgres():
        return {
            'backend': 'PostgreSQL',
            'fts_available': True,
            'approximate_matching': True,
            'algorithms': ['full-text-search', 'trigram-similarity']
        }
    elif is_sqlite():
        return {
            'backend': 'SQLite',
            'fts_available': False,
            'approximate_matching': True,
            'algorithms': ['fuzzy-matching', 'levenshtein-distance']
        }
    else:
        return {
            'backend': 'Unknown',
            'fts_available': False,
            'approximate_matching': False,
            'algorithms': ['basic-icontains']
        }
