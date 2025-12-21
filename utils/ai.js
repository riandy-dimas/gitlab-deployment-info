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

// Get download confirmation dialog content
export function getDownloadConfirmationContent(status) {
  if (status === 'before-download') {
    return {
      title: 'AI Model - First Time Setup',
      content: `
        <p><strong>🧠 The Gemini Nano AI model needs to be downloaded to your device.</strong></p>
        
        <div style="background: var(--pico-card-background-color); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
          <p style="margin: 0.5rem 0;"><strong>📦 Download Size:</strong> ~4GB</p>
          <p style="margin: 0.5rem 0;"><strong>⏱️ Estimated Time:</strong> 10-30 minutes</p>
          <p style="margin: 0.5rem 0;"><strong>🔒 Privacy:</strong> Runs completely offline on your device</p>
          <p style="margin: 0.5rem 0;"><strong>💾 One-time setup:</strong> Model will be reused for all future summaries</p>
        </div>
        
        <p><strong>During the download you can:</strong></p>
        <ul>
          <li>Continue using Chrome normally</li>
          <li>Monitor progress at: <code>chrome://on-device-internals/</code></li>
          <li>Close this extension and come back later</li>
        </ul>
        
        <p style="margin-top: 1rem;"><strong>Would you like to start downloading the AI model now?</strong></p>
      `,
      confirmText: 'Start Download',
      type: 'before-download'
    };
  } else if (status === 'after-download') {
    return {
      title: 'AI Model Download In Progress',
      content: `
        <p><strong>⏳ The Gemini Nano AI model is currently being downloaded in the background.</strong></p>
        
        <p>Please wait a few more minutes for the download to complete.</p>
        
        <div style="background: var(--pico-card-background-color); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
          <p style="margin: 0.5rem 0;"><strong>📊 Check progress at:</strong></p>
          <p style="margin: 0.5rem 0; padding-left: 1rem;"><code>chrome://on-device-internals/</code></p>
          <p style="margin: 0.5rem 0; padding-left: 1rem;"><small>(Look for "Foundational Model" status)</small></p>
        </div>
        
        <p><strong>Do you want to try anyway?</strong></p>
        <p><small>(This may fail if the download is not complete)</small></p>
      `,
      confirmText: 'Try Anyway',
      type: 'after-download'
    };
  }
  
  return null;
}

// Summarize using Chrome's Summarizer API
// Returns: { needsConfirmation: boolean, confirmationStatus?: string, result?: string }
export async function summarizeCommits(commits, userConfirmed = false) {
  if (!commits || commits.length === 0) {
    throw new Error('No commits to summarize');
  }
  
  // Check if API is available
  const summarizerStatus = await isSummarizerAvailable();
  console.log('Summarizer status:', summarizerStatus);
  
  if (!summarizerStatus.available) {
    // Check if we need user confirmation for download
    if (summarizerStatus.status === 'after-download' || summarizerStatus.status === 'before-download') {
      if (!userConfirmed) {
        // Return indication that confirmation is needed
        return {
          needsConfirmation: true,
          confirmationStatus: summarizerStatus.status
        };
      }
      
      // User has confirmed, but if model is still downloading, inform them
      if (summarizerStatus.status === 'after-download') {
        throw new Error('AI model is still downloading. Please wait a few minutes and try again. Check progress at chrome://on-device-internals/');
      }
      
      // For 'before-download', proceed - createSummarizer() will trigger the download
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
        const finalSummary = await summarizer.summarize(combinedSummary, { context: 'These are summarized deployment changes from multiple commit summaries. Provide a concise overall summary.' });
        
        return {
          needsConfirmation: false,
          result: finalSummary
        };
      } else {
        return {
          needsConfirmation: false,
          result: summaries[0]
        };
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
    
    return {
      needsConfirmation: false,
      result: summary
    };
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

// Check if AI is available and whether button should be enabled
export async function checkAIAvailability() {
  const summarizerStatus = await isSummarizerAvailable();
  
  if (summarizerStatus.available) {
    return {
      available: true,
      buttonEnabled: true,
      method: 'Chrome Summarizer API (Gemini Nano)',
      status: 'ready'
    };
  }
  
  // If the API is supported but model needs download or is downloading,
  // we should enable the button so users can start the download
  if (summarizerStatus.status === 'before-download') {
    return {
      available: false,
      buttonEnabled: true, // Enable button to allow download
      method: 'Chrome Summarizer API (Gemini Nano)',
      status: 'Click to download AI model (~4GB)'
    };
  }
  
  if (summarizerStatus.status === 'after-download') {
    return {
      available: false,
      buttonEnabled: true, // Enable button but will show warning
      method: 'Chrome Summarizer API (Gemini Nano)',
      status: 'Model downloading... Please wait'
    };
  }
  
  // API not supported at all - disable button
  return {
    available: false,
    buttonEnabled: false,
    method: 'Chrome Summarizer API (Gemini Nano)',
    status: `Not supported: ${summarizerStatus.reason}`
  };
}