// Simple script to check if data files can be loaded
async function checkDataFiles() {
  const subjects = ['mathematics', 'computer-science', 'science'];
  
  console.log('Starting data files check...');
  
  for (const subject of subjects) {
    try {
      const filePath = `data/${subject}-questions.json`;
      console.log(`Attempting to load: ${filePath}`);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        console.error(`Failed to load ${subject} questions: ${response.status} - ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Successfully loaded ${subject} data:`);
      console.log(`- Questions: ${data.questions.length}`);
      console.log(`- Topics: ${Object.keys(data.topicStructure).length}`);
      console.log('- Topics:', Object.keys(data.topicStructure).join(', '));
    } catch (error) {
      console.error(`Error loading ${subject} data:`, error);
    }
  }
}

// Run the check
document.addEventListener('DOMContentLoaded', checkDataFiles); 