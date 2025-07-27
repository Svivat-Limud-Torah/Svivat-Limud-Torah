// frontend/src/hooks/useSearch.js
import { useState, useCallback, useRef } from 'react';
import path from '../utils/pathUtils';
import { API_BASE_URL, HEBREW_TEXT } from '../utils/constants';

export default function useSearch({
  workspaceFolders,
  setGlobalLoadingMessage,
  setMainViewMode,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  const [searchOptions, setSearchOptions] = useState({
    isRegex: false,
    caseSensitive: false,
    wholeWord: false,
  });
  const [includePatternsInput, setIncludePatternsInput] = useState(''); 
  const [excludePatternsInput, setExcludePatternsInput] = useState('');

  const [currentSearchScope, setCurrentSearchScope] = useState({ basePath: null, relativePath: null, name: null });
  const [searchTermToHighlightInEditor, setSearchTermToHighlightInEditor] = useState(''); // State variable

  const handleSearchV2 = useCallback(async (triggeredFromUI = false) => {
    const term = searchTerm.trim();
    if (!term) {
      if (triggeredFromUI) setSearchError(HEBREW_TEXT.searchPlaceholder || "Please enter a search term.");
      setSearchResults([]);
      if (searchInputRef.current && triggeredFromUI) searchInputRef.current.focus();
      return;
    }
    if (term.length < 1 && !searchOptions.isRegex) {
      if (triggeredFromUI) setSearchError(HEBREW_TEXT.searchQueryTooShort || "Search term is too short.");
      setSearchResults([]);
      if (searchInputRef.current && triggeredFromUI) searchInputRef.current.focus();
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]); 
    setGlobalLoadingMessage(HEBREW_TEXT.searching || "Searching...");

    let effectiveBasePath;
    if (currentSearchScope.basePath) {
        effectiveBasePath = currentSearchScope.relativePath 
            ? path.join(currentSearchScope.basePath, currentSearchScope.relativePath)
            : currentSearchScope.basePath;
    } else if (workspaceFolders.length > 0 && workspaceFolders[0]?.path) {
        effectiveBasePath = workspaceFolders[0].path;
    } else {
        setIsSearching(false);
        setGlobalLoadingMessage('');
        if (triggeredFromUI) setSearchError(HEBREW_TEXT.addFolderToStart || "Please add a folder to the workspace to search.");
        return;
    }
    
    const include = includePatternsInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const exclude = excludePatternsInput.split(',').map(p => p.trim()).filter(p => p.length > 0);

    const requestBody = {
        basePath: effectiveBasePath,
        searchTerm: term,
        options: searchOptions,
        ...(include.length > 0 && { includePatterns: include }),
        ...(exclude.length > 0 && { excludePatterns: exclude }),
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/v2/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Search failed: ${response.status}`);
        }

        const data = await response.json();
        
        const rootNameForDisplay = currentSearchScope.name || 
                                   (currentSearchScope.basePath ? path.basename(currentSearchScope.basePath) : null) ||
                                   (workspaceFolders[0]?.name ? workspaceFolders[0].name : null) ||
                                   (effectiveBasePath ? path.basename(effectiveBasePath) : "Search Results");
        
        let originalWorkspaceRootPath = currentSearchScope.basePath || (workspaceFolders[0]?.path || effectiveBasePath);

        const formattedResults = data.map(fileResult => ({
            searchRootPath: effectiveBasePath,
            originalRootPath: originalWorkspaceRootPath,
            rootName: rootNameForDisplay, 
            relativePath: fileResult.filePath,
            fileName: fileResult.fileName,
            matches: fileResult.matches.map(match => ({
                lineNumber: match.lineNumber,
                lineText: match.lineText,
                matchPreview: match.matchPreview,
                contextBefore: match.contextBefore,
                contextAfter: match.contextAfter,
                charPositionsInLine: match.charPositionsInLine || [],
            })),
            type: 'file', 
        }));

        setSearchResults(formattedResults);
        if (formattedResults.length === 0 && triggeredFromUI) {
            setSearchError(HEBREW_TEXT.noResultsFound || "No results found.");
        }
        setSearchTermToHighlightInEditor(term); 
    } catch (error) {
        console.error("Error performing V2 search:", error);
        if (triggeredFromUI) setSearchError(error.message || (HEBREW_TEXT.error || "Error") + " performing search.");
        setSearchTermToHighlightInEditor('');
    } finally {
        setIsSearching(false);
        setGlobalLoadingMessage('');
    }
  }, [
    searchTerm, 
    workspaceFolders, 
    currentSearchScope, 
    setGlobalLoadingMessage, 
    searchOptions, 
    includePatternsInput, 
    excludePatternsInput,
    // Added setSearchTermToHighlightInEditor to dependency array as it's used inside
    setSearchTermToHighlightInEditor 
  ]);

  const handleSetSearchScopeAndTriggerSearch = useCallback((baseFolderOfItem, relativeItemPath, itemNameInScope) => {
    if (!baseFolderOfItem || !baseFolderOfItem.path) {
        alert("Error: Base folder for search scope not identified.");
        return;
    }
    
    setCurrentSearchScope({
        basePath: baseFolderOfItem.path,
        relativePath: relativeItemPath,
        name: itemNameInScope || (relativeItemPath ? path.basename(relativeItemPath) : path.basename(baseFolderOfItem.path))
    });

    setMainViewMode('search');
    
    if (searchTerm.trim()) {
        handleSearchV2(true); 
    } else {
        setSearchResults([]);
        setSearchError(HEBREW_TEXT.searchScopeUpdatedEnterTerm || "Scope updated. Enter search term.");
        setSearchTermToHighlightInEditor(''); // Clear highlight on scope change without search
        setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [setMainViewMode, searchTerm, handleSearchV2, setSearchTermToHighlightInEditor]); // Added setSearchTermToHighlightInEditor

  const clearSearchScope = useCallback(() => {
    setCurrentSearchScope({ basePath: null, relativePath: null, name: null });
    if (searchTerm.trim()) {
      handleSearchV2(true);
    } else {
      setSearchResults([]);
      setSearchError(HEBREW_TEXT.searchScopeClearedEnterTerm || "Scope cleared. Enter search term to search workspace.");
      setSearchTermToHighlightInEditor(''); // Clear highlight on scope clear
    }
  }, [searchTerm, handleSearchV2, setSearchTermToHighlightInEditor]); // Added setSearchTermToHighlightInEditor

  const debouncedSearchRef = useRef(null);
  const triggerSearchWithOptionsChange = useCallback(() => {
    if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current);
    }
    debouncedSearchRef.current = setTimeout(() => {
        if (searchTerm.trim()) {
            handleSearchV2(false); 
        }
    }, 500);
  }, [searchTerm, handleSearchV2]);

  const handleSearchOptionChange = useCallback((optionName, value) => {
    setSearchOptions(prev => ({...prev, [optionName]: value}));
    triggerSearchWithOptionsChange();
  }, [triggerSearchWithOptionsChange]);

  const handleIncludePatternsChange = useCallback((value) => {
    setIncludePatternsInput(value);
    triggerSearchWithOptionsChange();
  }, [triggerSearchWithOptionsChange]);

  const handleExcludePatternsChange = useCallback((value) => {
    setExcludePatternsInput(value);
    triggerSearchWithOptionsChange();
  }, [triggerSearchWithOptionsChange]);


  return {
    searchTerm,
    setSearchTerm,
    searchInputRef,
    searchResults,
    setSearchResults,
    isSearching,
    searchError,
    setSearchError,
    
    searchOptions,
    handleSearchOptionChange,
    
    includePatternsInput,
    handleIncludePatternsChange,

    excludePatternsInput,
    handleExcludePatternsChange,

    currentSearchScope,
    setCurrentSearchScope, // Re-exposing for external state clearing if necessary, e.g. on folder removal
    searchTermToHighlightInEditor,
    setSearchTermToHighlightInEditor, // **** THIS IS THE FIX: Re-expose the setter ****
    
    handleSearch: () => handleSearchV2(true),
    handleSetSearchScopeAndTriggerSearch,
    clearSearchScope,
  };
}