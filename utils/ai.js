let summarizerInstance = null;

// Check if Chrome's Summarization API is available
export async function isSummarizerAvailable() {
  // Check from the docs
  if (!('Summarizer' in self)) {
    return { available: false, reason: 'Summarizer API not supported in this browser' };
  }
  
  try {
    const availability = await Summarizer.availability();
    console.log('Summarizer availability:', availability);
    switch (availability) {
      case 'downloadable':
        return { available: false, status: 'before-download', reason: 'Model needs to be downloaded' };
      case 'downloading':
        return { available: false, status: 'after-download', reason: 'Model is downloading' };
      case 'available':
        return { available: true, status: 'ready', reason: 'Summarizer API is available' };
      default: 
        return { available: false, reason: `Unknown availability status: ${availability}` };
    }
  } catch (error) {
    console.log('Summarizer API error:', error);
    return { available: false, reason: error.message };
  }
}

// Create a summarizer session
async function createSummarizer() {
  const defaultOptions = {
    sharedContext: "These are deployment changes from a GitLab repository. Focus on what was changed. Do not include information related to the commit's label or categorization.",
    type: 'tldr',  // 'tldr', 'teaser', 'key-points', 'headline'
    format: 'plain-text', // 'plain-text' or 'markdown'
    length: 'short',      // 'short', 'medium', 'long'
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        console.log(`Downloaded ${e.loaded} of ${e.total} bytes`);
        console.log(`Progress: ${Math.round((e.loaded / e.total) * 100)}%`);
      });
    },
    expectedInputLanguages: ['en'],
    outputLanguage: 'en',
    expectedContextLanguages: ['en'],
  };
  
  const config = { ...defaultOptions };
  
  const summarizer = await self.Summarizer.create(config);
  return summarizer;
}

// Get or create summarizer instance (reuse existing instance)
async function getSummarizer() {
  if (!summarizerInstance) {
    console.log('Creating new summarizer instance...');
    summarizerInstance = await createSummarizer();
  } else {
    console.log('Reusing existing summarizer instance');
  }
  return summarizerInstance;
}

// Truncate commits if too long (approximate token limit)
function truncateCommits(commits, maxChars = 3000) {
  const truncated = [];
  let totalLength = 0;
  
  for (const commit of commits) {
    // Take first 200 chars of each commit to keep it concise
    const shortCommit = commit.length > 200 ? commit.substring(0, 200) + '...' : commit;
    
    if (totalLength + shortCommit.length > maxChars) {
      break;
    }
    
    truncated.push(shortCommit);
    totalLength += shortCommit.length;
  }
  
  return truncated;
}

// Chunk commits into smaller groups
function chunkCommits(commits, chunkSize = 15) {
  const chunks = [];
  for (let i = 0; i < commits.length; i += chunkSize) {
    chunks.push(commits.slice(i, i + chunkSize));
  }
  return chunks;
}

// Show confirmation dialog for model download
function showDownloadConfirmation(status) {
  let message = '';
  
  if (status === 'before-download') {
    message = 'The AI Summarization model needs to be downloaded before use.\n\n' +
              'This is a one-time download that may take several minutes depending on your connection.\n' +
              'The download will happen in the background.\n\n' +
              'You can monitor progress at: chrome://components/\n\n' +
              'Do you want to start the download and continue?';
  } else if (status === 'after-download') {
    message = 'The AI model is currently downloading in the background.\n\n' +
              'Please wait a few minutes for the download to complete.\n' +
              'You can check the download progress at: chrome://components/\n\n' +
              'Do you want to try anyway? (This may fail if download is not complete)';
  }
  
  return confirm(message);
}

// Summarize using Chrome's Summarizer API
export async function summarizeCommits(commits) {
  if (!commits || commits.length === 0) {
    throw new Error('No commits to summarize');
  }
  
  // Check if API is available
  const summarizerStatus = await isSummarizerAvailable();
  console.log('Summarizer status:', summarizerStatus);
  
  if (!summarizerStatus.available) {
    // Show confirmation dialog for download scenarios
    if (summarizerStatus.status === 'after-download' || summarizerStatus.status === 'before-download') {
      const userConfirmed = showDownloadConfirmation(summarizerStatus.status);
      
      if (!userConfirmed) {
        throw new Error('AI summarization cancelled by user');
      }
      
      // If user confirmed but model is still downloading, inform them
      if (summarizerStatus.status === 'after-download') {
        throw new Error('AI model is still downloading. Please wait a few minutes and try again. Check progress at chrome://components/');
      }
      
      // For 'before-download', we'll proceed and let the API start the download
      // The createSummarizer() call will trigger the download
    } else {
      throw new Error(`Summarizer API not available: ${summarizerStatus.reason}`);
    }
  }
  
  try {
    // Get or create the summarizer instance
    const summarizer = await getSummarizer();
    
    console.log(`Processing ${commits.length} commits`);
    
    // Strategy 1: If commits are too many, chunk them
    if (commits.length > 20) {
      console.log('Too many commits, chunking...');
      const chunks = chunkCommits(commits, 15);
      const summaries = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkText = chunk.join('\n');
        
        // Truncate if still too long
        const truncatedText = chunkText.length > 3000 
          ? chunkText.substring(0, 3000) + '...' 
          : chunkText;
        
        console.log(`Summarizing chunk ${i + 1}/${chunks.length} (${truncatedText.length} chars)`);
        const chunkSummary = await summarizer.summarize(truncatedText);
        summaries.push(chunkSummary);
      }
      
      // If we have multiple summaries, combine them
      if (summaries.length > 1) {
        const combinedSummary = summaries.join(' ');
        
        console.log('Summarizing combined summaries...');
        return await summarizer.summarize(combinedSummary, { context: 'These are summarized deployment changes from multiple commit summaries. Provide a concise overall summary.' });

      } else {
        return summaries[0];
      }
    }
    
    // Strategy 2: Truncate each commit to first 200 chars
    console.log('Truncating commits...');
    const truncatedCommits = truncateCommits(commits, 3000);
    const text = truncatedCommits.join('\n');
    
    console.log(`Summarizing ${truncatedCommits.length} commits (${text.length} chars)`);
    
    // Summarize the text
    const summary = await summarizer.summarize(text, { context: 'These are truncated commits that were shortened to first 200 characters. Provide a concise overall summary.' });
    
    // Keep the instance alive, don't destroy it
    console.log('Summary generated successfully, keeping instance alive');
    
    return summary;
  } catch (error) {
    console.error('Summarization error:', error);
    
    // If there's an error, clean up the instance so it can be recreated
    if (summarizerInstance) {
      try {
        summarizerInstance.destroy();
      } catch (destroyError) {
        console.error('Error destroying summarizer:', destroyError);
      }
      summarizerInstance = null;
    }
    
    throw new Error(`Failed to summarize: ${error.message}`);
  }
}

// Clean up the summarizer instance (call this when extension is closed)
export function cleanupSummarizer() {
  if (summarizerInstance) {
    console.log('Cleaning up summarizer instance...');
    try {
      summarizerInstance.destroy();
    } catch (error) {
      console.error('Error destroying summarizer:', error);
    }
    summarizerInstance = null;
  }
}

export async function checkAIAvailability() {
  const summarizerStatus = await isSummarizerAvailable();
  
  if (summarizerStatus.available) {
    return {
      available: true,
      method: 'Chrome Summarizer API',
      status: 'ready'
    };
  }
  
  if (summarizerStatus.status === 'after-download') {
    return {
      available: false,
      method: 'Chrome Summarizer API',
      status: 'Model is downloading. Please wait...'
    };
  }
  
  if (summarizerStatus.status === 'before-download') {
    return {
      available: false,
      method: 'Chrome Summarizer API',
      status: 'Model needs to be downloaded. Click AI Summary to start.'
    };
  }
  
  return {
    available: false,
    method: 'Chrome Summarizer API',
    status: `Not available: ${summarizerStatus.reason}`
  };
}