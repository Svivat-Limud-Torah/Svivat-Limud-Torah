// frontend/src/hooks/useSearch.js
import { useState, useCallback, useRef } from 'react';
import path from '../utils/pathUtils';
import { API_BASE_URL, HEBREW_TEXT } from '../utils/constants';
import LocalFileSystemService from '../services/LocalFileSystemService';

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

  const searchOneFolder = useCallback(async (basePath, term, options, include, exclude) => {
    // Read files from browser File System Access API.
    // readAllTextFiles will try to restore permission from IndexedDB if needed
    // (this is called inside a user gesture so requestPermission is allowed).
    let files = null;
    try {
      files = await LocalFileSystemService.readAllTextFiles(basePath, 500);
    } catch (e) {
      // Permission denied or handle missing — fall through without files.
      // The backend /api/v2/search will return a clear error for missing basePath.
      throw new Error(
        'לא ניתן לקרוא את הקבצים. אנא סגור ופתח מחדש את התיקייה בסביבת העבודה: ' + basePath
      );
    }

    const response = await fetch(`${API_BASE_URL}/v2/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basePath,
        searchTerm: term,
        options,
        ...(include.length > 0 && { includePatterns: include }),
        ...(exclude.length > 0 && { excludePatterns: exclude }),
        ...(files && { files }),
      }),
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Search failed: ${response.status}`);
    }
    return response.json();
  }, []);

  const handleSearchV2 = useCallback(async (triggeredFromUI = false) => {
    const term = searchTerm.trim();
    if (!term) {
      if (triggeredFromUI) setSearchError(HEBREW_TEXT.searchPlaceholder || "Please enter a search term.");
      setSearchResults([]);
      if (searchInputRef.current && triggeredFromUI) searchInputRef.current.focus();
      return;
    }

    if (workspaceFolders.length === 0) {
      setSearchError(HEBREW_TEXT.addFolderToStart || "Please add a folder to the workspace to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setGlobalLoadingMessage(HEBREW_TEXT.searching || "Searching...");

    const include = includePatternsInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const exclude = excludePatternsInput.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const opts = searchOptions;

    try {
      let allFormattedResults = [];

      if (currentSearchScope.basePath) {
        // Scoped search — single folder/subfolder
        const effectiveBasePath = currentSearchScope.relativePath
          ? path.join(currentSearchScope.basePath, currentSearchScope.relativePath)
          : currentSearchScope.basePath;
        const rootName = currentSearchScope.name || path.basename(effectiveBasePath);
        const data = await searchOneFolder(effectiveBasePath, term, opts, include, exclude);
        allFormattedResults = data.map(f => ({
          searchRootPath: effectiveBasePath,
          originalRootPath: currentSearchScope.basePath,
          rootName,
          relativePath: f.filePath,
          fileName: f.fileName,
          matches: f.matches,
          type: 'file',
        }));
      } else {
        // Global search — search ALL workspace folders
        const promises = workspaceFolders.map(async (folder) => {
          try {
            const data = await searchOneFolder(folder.path, term, opts, include, exclude);
            return data.map(f => ({
              searchRootPath: folder.path,
              originalRootPath: folder.path,
              rootName: folder.name || path.basename(folder.path),
              relativePath: f.filePath,
              fileName: f.fileName,
              matches: f.matches,
              type: 'file',
            }));
          } catch {
            return []; // Skip folders that error
          }
        });
        const resultsArrays = await Promise.all(promises);
        allFormattedResults = resultsArrays.flat();
      }

      setSearchResults(allFormattedResults);
      if (allFormattedResults.length === 0 && triggeredFromUI) {
        setSearchError(HEBREW_TEXT.noResultsFound || "No results found.");
      }
      setSearchTermToHighlightInEditor(term);
    } catch (error) {
      console.error("Error performing V2 search:", error);
      if (triggeredFromUI) setSearchError(error.message || "Error performing search.");
      setSearchTermToHighlightInEditor('');
    } finally {
      setIsSearching(false);
      setGlobalLoadingMessage('');
    }
  }, [
    searchTerm, workspaceFolders, currentSearchScope, setGlobalLoadingMessage,
    searchOptions, includePatternsInput, excludePatternsInput,
    setSearchTermToHighlightInEditor, searchOneFolder,
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
    
    // Always clear the search term and show the scope updated message
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(HEBREW_TEXT.searchScopeUpdatedEnterTerm || "היקף החיפוש עודכן. הזן מונח לחיפוש.");
    setSearchTermToHighlightInEditor(''); // Clear highlight on scope change
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [setMainViewMode, setSearchTermToHighlightInEditor]); // Removed searchTerm and handleSearchV2 from dependencies since we're not using them

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