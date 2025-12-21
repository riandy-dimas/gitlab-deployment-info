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
    length: 'medium',      // 'short', 'medium', 'long'
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

// Summarize using Chrome's Summarizer API
export async function summarizeCommits(commits) {
  if (!commits || commits.length === 0) {
    throw new Error('No commits to summarize');
  }
  
  // Check if API is available
  const summarizerStatus = await isSummarizerAvailable();
  console.log('Summarizer status:', summarizerStatus);
  
  if (!summarizerStatus.available) {
    if (summarizerStatus.status === 'after-download') {
      throw new Error('AI model is downloading. Please wait a few minutes and try again. You can check progress at chrome://components/');
    } else if (summarizerStatus.status === 'before-download') {
      throw new Error('AI model needs to be downloaded. It will start downloading when you click OK. Please try again in a few minutes.');
    } else {
      throw new Error(`Summarizer API not available: ${summarizerStatus.reason}`);
    }
  }
  
  try {
    // Get or create the summarizer instance
    const summarizer = await getSummarizer();
    
    // Combine commits into a single text
    const text = commits.join('\n');
    
    // Summarize the text
    const summary = await summarizer.summarize(text);
    
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