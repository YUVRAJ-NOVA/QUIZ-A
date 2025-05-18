document.addEventListener("DOMContentLoaded", async () => {
  // First, attempt to initialize the performance chart immediately
  try {
    const performanceCtx = document.getElementById("performanceChart");
    if (performanceCtx && typeof Chart !== 'undefined') {
      console.log("Initializing performance chart at document load");
      // Create chart directly
      window.performanceChart = new Chart(performanceCtx.getContext("2d"), {
        type: "line",
        data: {
          labels: ["Start"],
          datasets: [{
            label: "Ability Estimate",
            data: [0],
            borderColor: "#6E44FF",
            backgroundColor: "rgba(110, 68, 255, 0.1)",
            tension: 0.4,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "rgba(255, 255, 255, 0.7)",
              },
            },
            x: {
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "rgba(255, 255, 255, 0.7)",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
      
      // Make sure the container is visible
      const container = performanceCtx.parentElement;
      if (container) {
        container.style.display = "block";
        container.style.height = "20rem";
        container.style.visibility = "visible";
      }
    }
  } catch (e) {
    console.warn("Error initializing performance chart at start:", e);
  }
  
  // Get selected subject from localStorage
  const selectedSubject = localStorage.getItem("selectedSubject") || "mathematics"
  
  // Initialize quiz state
  const quizState = {
    currentQuestion: 1,
    totalQuestions: 10,
    abilityEstimate: 0.0,
    selectedAnswer: null,
    timer: 0,
    timerInterval: null,
    questions: [],
    currentQuestionData: null,
    selectedSubject,
    answeredQuestions: [],
    topicMasteries: {},
    subjectTopics: {},
    topicWeights: {},
    questionsLoading: false,
    eventListenersInitialized: false
  }
  
  // Load questions for the selected subject
  async function loadQuestions() {
    try {
      // Show loading indicator with subject name
      const quizStage = document.querySelector(".quiz-stage")
      if (quizStage) {
        quizStage.innerHTML = `
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading ${quizState.selectedSubject.replace("-", " ")} questions...</p>
          </div>
        `
      }
      
      // Determine the correct data file based on the selected subject
      let dataFile = ""
      switch(selectedSubject) {
        case "mathematics":
          dataFile = "data/mathematics-questions.json"
          break
        case "computer-science":
          dataFile = "data/computer-science-questions.json"
          break
        case "science":
          dataFile = "data/science-questions.json"
          break
        default:
          dataFile = "data/mathematics-questions.json"
      }
      
      console.log(`Attempting to load questions from: ${dataFile}`)
      
      // Fetch the questions data
      const response = await fetch(dataFile)
      if (!response.ok) {
        throw new Error(`Failed to load questions (${response.status} - ${response.statusText})`)
      }
      
      const data = await response.json()
      quizState.questions = data.questions
      quizState.subjectTopics = data.topicStructure
      
      console.log(`Successfully loaded ${quizState.questions.length} questions for ${quizState.selectedSubject}`)
      
      // Initialize topic masteries and weights
      Object.keys(data.topicStructure).forEach(topic => {
        quizState.topicMasteries[topic] = 0.25 // Initial mastery estimation (25%)
        quizState.topicWeights[topic] = 1.0 // Equal initial weights
      })
      
      return true
    } catch (error) {
      console.error("Error loading questions:", error)
      const quizStage = document.querySelector(".quiz-stage")
      if (quizStage) {
        quizStage.innerHTML = `
          <div class="error-message">
            <h2>Failed to load questions</h2>
            <p>${error.message}</p>
            <button class="cta-button primary" onclick="window.location.href='index.html'">Return to Home</button>
          </div>
        `
      }
      return false
    }
  }
  
  // Initialize the IRT model parameters
  function initializeIRTModel() {
    // Set initial ability estimate
    quizState.abilityEstimate = 0.5  // Start at middle of scale for more balanced updates
    
    // Initialize time tracking variables
    quizState.quizStartTime = Date.now();
    quizState.lastTimerUpdate = Date.now();
    quizState.timer = 0;
    quizState.totalTime = 0;
    
    // Check and prepare the performance chart container
    const performanceChartContainer = document.querySelector(".performance-chart");
    if (performanceChartContainer) {
      // Make sure the container is visible and properly sized
      performanceChartContainer.style.display = "block";
      performanceChartContainer.style.height = "20rem";
      performanceChartContainer.style.width = "100%";
      performanceChartContainer.style.position = "relative";
      
      // Add placeholder text if no canvas yet
      const canvas = performanceChartContainer.querySelector("canvas");
      if (!canvas) {
        const placeholderText = document.createElement("div");
        placeholderText.style.position = "absolute";
        placeholderText.style.top = "50%";
        placeholderText.style.left = "50%";
        placeholderText.style.transform = "translate(-50%, -50%)";
        placeholderText.style.color = "rgba(255, 255, 255, 0.3)";
        placeholderText.style.fontSize = "14px";
        placeholderText.textContent = "Performance chart loading...";
        
        performanceChartContainer.appendChild(placeholderText);
      }
    }
    
    // Immediately update display
    updateAbilityDisplay()
    
    // Ensure the ability display is properly initialized with a delayed update
    setTimeout(() => {
      // Reset and reinitialize ability history for charts
      quizState.abilityHistory = [0]
      
      // Force another update of the display
      updateAbilityDisplay()
      
      // Initialize chart with starting value
      const performanceCtx = document.getElementById("performanceChart")
      if (performanceCtx && window.Chart && typeof window.Chart === 'function') {
        try {
          if (!window.performanceChart) {
            console.log("No performance chart found, initializing now");
            // Create the chart directly rather than calling initializeResultsCharts
            window.performanceChart = new Chart(performanceCtx.getContext("2d"), {
              type: "line",
              data: {
                labels: ["Q0"],
                datasets: [{
                  label: "Ability Estimate",
                  data: [0],
                  borderColor: "#6E44FF",
                  backgroundColor: "rgba(110, 68, 255, 0.1)",
                  tension: 0.4,
                  fill: true,
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 1,
                    grid: {
                      color: "rgba(255, 255, 255, 0.05)",
                    },
                    ticks: {
                      color: "rgba(255, 255, 255, 0.7)",
                    },
                  },
                  x: {
                    grid: {
                      color: "rgba(255, 255, 255, 0.05)",
                    },
                    ticks: {
                      color: "rgba(255, 255, 255, 0.7)",
                    },
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              },
            });
            
            // Force size calculation
            setTimeout(() => {
              if (window.performanceChart) {
                window.performanceChart.resize();
              }
            }, 100);
          } else {
            window.performanceChart.data.labels = ["Q0"]
            window.performanceChart.data.datasets[0].data = [0]
            window.performanceChart.update('none')
          }
          console.log("Performance chart initialized with starting values")
        } catch (error) {
          console.warn("Failed to initialize performance chart:", error)
        }
      }
    }, 500)
  }
  
  // Item Response Theory selection algorithm
  function selectNextQuestion() {
    if (quizState.questions.length === 0) return null
    
    // For Thompson Sampling, select a topic first
    const selectedTopic = selectTopicWithThompsonSampling()
    
    // Filter questions by topic and not answered yet
    const availableQuestions = quizState.questions.filter(q => 
      q.topic === selectedTopic && 
      !quizState.answeredQuestions.includes(q.id)
    )
    
    if (availableQuestions.length === 0) {
      // If no questions in the selected topic, choose from any topic
      const anyAvailableQuestions = quizState.questions.filter(q => 
        !quizState.answeredQuestions.includes(q.id)
      )
      
      if (anyAvailableQuestions.length === 0) return null
      
      // For IRT, choose question with difficulty closest to current ability
      return anyAvailableQuestions.reduce((best, current) => {
        const bestDiff = Math.abs(best.difficulty - quizState.abilityEstimate)
        const currentDiff = Math.abs(current.difficulty - quizState.abilityEstimate)
        return currentDiff < bestDiff ? current : best
      })
    }
    
    // For IRT, choose question with difficulty closest to current ability
    return availableQuestions.reduce((best, current) => {
      const bestDiff = Math.abs(best.difficulty - quizState.abilityEstimate)
      const currentDiff = Math.abs(current.difficulty - quizState.abilityEstimate)
      return currentDiff < bestDiff ? current : best
    })
  }
  
  // Thompson Sampling algorithm to select topic
  function selectTopicWithThompsonSampling() {
    const topics = Object.keys(quizState.topicMasteries);
    
    // Cache the values to avoid repeated calculations
    if (!quizState.cachedTopicSamples || quizState.questionChanged) {
    // Sample from beta distribution for each topic using topic mastery
    const samples = topics.map(topic => {
        const mastery = quizState.topicMasteries[topic];
        const weight = quizState.topicWeights[topic];
      
      // For beta distribution, we need successes and failures
      // Higher weight for topics with lower mastery
        const alpha = 1 + mastery * 10; // successes
        const beta = 1 + (1 - mastery) * 10; // failures
        
        // Sample from beta distribution - using cached random values when possible
        const sample = sampleBeta(alpha, beta) * weight;
        return { topic, sample };
      });
      
      // Cache the samples
      quizState.cachedTopicSamples = samples;
      quizState.questionChanged = false;
    }
    
    // Select topic with highest sample
    const selectedTopic = quizState.cachedTopicSamples.reduce((best, current) => {
      return current.sample > best.sample ? current : best;
    });
    
    return selectedTopic.topic;
  }
  
  // Optimize the beta distribution sampling with caching
  function sampleBeta(alpha, beta) {
    // Use simple approximation for common cases to improve performance
    if (alpha === 1 && beta === 1) {
      return Math.random(); // Uniform distribution
    }
    
    if (alpha > 8 && beta > 8) {
      // Normal approximation for large alpha and beta
      const mean = alpha / (alpha + beta);
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
      const stdDev = Math.sqrt(variance);
      
      // Box-Muller transform to generate normal random variable
      let u1 = 0, u2 = 0;
      do {
        u1 = Math.random();
        u2 = Math.random();
      } while (u1 <= Number.EPSILON);
      
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      let sample = mean + z * stdDev;
      
      // Clamp to [0,1]
      return Math.max(0, Math.min(1, sample));
    }
    
    // For other cases, use the gamma method which is more accurate but slower
    const x = gammaRandom(alpha);
    const y = gammaRandom(beta);
    return x / (x + y);
  }
  
  // Optimize the gamma random generator
  function gammaRandom(shape) {
    // For shape = 1, return exponential
    if (Math.abs(shape - 1.0) < 0.0001) {
      return -Math.log(1.0 - Math.random());
    }
    
    // Marsaglia and Tsang method for shape > 1
    if (shape > 1) {
      const d = shape - 1.0/3.0;
      const c = 1.0 / Math.sqrt(9.0 * d);
      
      let v, x;
      do {
        let u1, u2;
        do {
          u1 = Math.random();
          u2 = Math.random();
          v = Math.pow(1.0 + c * (u1 - 0.5), 3);
        } while(v <= 0);
        
        const x = d * v;
        const u3 = Math.random();
        
        if (u3 < 1.0 - 0.0331 * Math.pow(u2, 2)) {
          return x;
        }
        
        if (Math.log(u3) < 0.5 * Math.pow(u2, 2) + d * (1.0 - v + Math.log(v))) {
          return x;
        }
      } while(true);
    }
    
    // For 0 < shape < 1, use Ahrens and Dieter method
    // Use a more efficient implementation to avoid deep recursion
    let x = 0;
    while (shape > 0) {
      if (shape < 1) {
        const factor = Math.pow(Math.random(), 1.0/shape);
        x += -Math.log(1.0 - Math.random()) * factor;
        break;
      } else {
        x += gammaRandom(1.0);
        shape -= 1.0;
      }
    }
    return x;
  }

  // DOM elements with safety checks
  const questionNumber = document.querySelector(".question-number")
  const abilityValue = document.querySelector(".ability-value")
  const abilityFill = document.querySelector(".ability-fill")
  const answerOptions = document.querySelectorAll(".answer-option")
  const submitButton = document.querySelector(".submit-button")
  const feedbackPanel = document.querySelector(".feedback-panel")
  const nextQuestionButton = document.querySelector(".next-question-button")
  const exitButton = document.querySelector(".exit-button")
  const resultsOverlay = document.querySelector(".results-overlay")
  const closeResults = document.querySelector(".close-results")
  const timerDisplay = document.querySelector(".timer")
  const hintButton = document.querySelector(".hint-button")
  const voiceButton = document.querySelector(".voice-button")
  const retryButton = document.querySelector(".action-button.retry")
  const shareButton = document.querySelector(".action-button.share")
  const homeButton = document.querySelector(".action-button.home")

  // Initialize performance chart with safety checks
  let performanceChart = null;  // Make it a global variable
  const performanceCtx = document.getElementById("performanceChart");

  if (performanceCtx && window.Chart) {
    try {
      window.performanceChart = new Chart(performanceCtx.getContext("2d"), {
        type: "line",
        data: {
          labels: ["Q1"],
          datasets: [
            {
              label: "Ability Estimate",
              data: [0],
              borderColor: "#6E44FF",
              backgroundColor: "rgba(110, 68, 255, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "rgba(255, 255, 255, 0.7)",
              },
            },
            x: {
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
              },
              ticks: {
                color: "rgba(255, 255, 255, 0.7)",
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
      // Assign to both the window property and the local variable for backwards compatibility
      performanceChart = window.performanceChart;
      console.log("Performance chart initialized successfully");
    } catch (error) {
      console.error("Error initializing performance chart:", error);
    }
  }

  // Initialize knowledge radar chart for results with safety checks
  let radarChart
  const radarCtx = document.getElementById("knowledgeRadar")
  
  if (radarCtx && window.Chart) {
    try {
      // Get topic names based on selected subject
      const defaultLabels = quizState.selectedSubject === "mathematics" 
        ? ["Algebra", "Geometry", "Calculus", "Statistics", "Probability"]
        : quizState.selectedSubject === "computer-science"
          ? ["Programming", "Algorithms", "Data Structures", "Computer Systems", "Theory"]
          : ["Physics", "Chemistry", "Biology", "Earth Science", "Astronomy"]
      
      radarChart = new Chart(radarCtx.getContext("2d"), {
    type: "radar",
    data: {
          labels: defaultLabels,
      datasets: [
        {
          label: "Topic Mastery",
              data: [0.3, 0.3, 0.3, 0.3, 0.3],
          backgroundColor: "rgba(110, 68, 255, 0.2)",
          borderColor: "#6E44FF",
          pointBackgroundColor: "#FF44E3",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#FF44E3",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
          pointLabels: {
            color: "rgba(255, 255, 255, 0.7)",
            font: {
              size: 14,
            },
          },
          ticks: {
            backdropColor: "transparent",
            color: "rgba(255, 255, 255, 0.5)",
          },
          suggestedMin: 0,
          suggestedMax: 1,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  })
    } catch (error) {
      console.error("Error initializing radar chart:", error)
    }
  }

  // Start timer
  function startTimer() {
    // Initialize time tracking if not already set
    if (!quizState.quizStartTime) {
      quizState.quizStartTime = Date.now();
    }
    
    // Reset or initialize the timer
    quizState.timer = 0;
    quizState.lastTimerUpdate = Date.now();
    
    // Clear any existing interval
    clearInterval(quizState.timerInterval);
    
    // Make sure we have a timer display
    if (!timerDisplay) {
      timerDisplay = document.querySelector(".timer");
      if (!timerDisplay) return;
    }

    // Use setInterval for regular UI updates
    quizState.timerInterval = setInterval(() => {
      // Calculate elapsed time since last update
      const now = Date.now();
      const elapsed = Math.floor((now - quizState.lastTimerUpdate) / 1000);
      
      // Update timer with accurate time
      quizState.timer += elapsed;
      quizState.lastTimerUpdate = now;
      
      // Store total elapsed time from quiz start
      quizState.totalTime = Math.floor((now - quizState.quizStartTime) / 1000);
      
      // Update display
      updateTimerDisplay();
    }, 1000);
    
    // Initial display update
    updateTimerDisplay();
  }

  // Update timer display
  function updateTimerDisplay() {
    if (!timerDisplay) {
      timerDisplay = document.querySelector(".timer");
      if (!timerDisplay) return;
    }
    
    // Format time as MM:SS
    const minutes = Math.floor(quizState.timer / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (quizState.timer % 60)
      .toString()
      .padStart(2, "0");
    
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }

  // Update ability estimate display
  function updateAbilityDisplay() {
    // Always re-query the DOM elements to ensure they're current
    const abilityValueElement = document.querySelector(".ability-value");
    const abilityFillElement = document.querySelector(".ability-fill");
    
    if (!abilityValueElement || !abilityFillElement) {
      console.error("Critical UI elements for ability display not found:", {
        abilityValueFound: !!abilityValueElement,
        abilityFillFound: !!abilityFillElement
      });
      // Try again after a short delay (DOM might still be updating)
      setTimeout(() => {
        const retryValueElement = document.querySelector(".ability-value");
        const retryFillElement = document.querySelector(".ability-fill");
        
        if (retryValueElement) {
          retryValueElement.textContent = quizState.abilityEstimate.toFixed(1);
          console.log("Retry: Updated ability value display:", quizState.abilityEstimate.toFixed(1));
        }
        
        if (retryFillElement) {
          const fillWidth = `${quizState.abilityEstimate * 100}%`;
          retryFillElement.style.width = fillWidth;
          console.log("Retry: Updated ability fill width:", fillWidth);
        }
      }, 100);
      return;
    }
    
    // Update the text display
    const displayValue = quizState.abilityEstimate.toFixed(1);
    abilityValueElement.textContent = displayValue;
    
    // Update the progress bar
    const fillWidth = `${quizState.abilityEstimate * 100}%`;
    abilityFillElement.style.width = fillWidth;
    
    console.log("Ability display updated successfully:", {
      value: displayValue,
      width: fillWidth,
      elementContent: abilityValueElement.textContent
    });
  }

  // Display a question with safety checks and more detailed error handling
  function displayQuestion(questionData) {
    if (!questionData) {
      console.error("No question data provided to display");
      return;
    }
    
    try {
      console.log(`Displaying question: ${questionData.id} - Topic: ${questionData.topic}`);
      
      // Store the current question data
      quizState.currentQuestionData = questionData;
      
      // Get the quiz stage
      const quizStage = document.querySelector(".quiz-stage");
      if (!quizStage) {
        console.error("Quiz stage element not found");
        return;
      }
      
      // Clear the quiz stage to avoid stacking elements
      const existingFeedbackPanel = quizStage.querySelector(".feedback-panel");
      const existingQuestionCard = quizStage.querySelector(".question-card");
      
      // Remove existing question card if any
      if (existingQuestionCard) {
        existingQuestionCard.remove();
      }
      
      // Create a completely new question card
      createQuestionCard(quizStage, questionData);
      
      // Reset selected answer
      quizState.selectedAnswer = null;
      
      // Force update sidebar information
      updateSidebarForQuestion(questionData);
      
      // Force update of ability display
      updateAbilityDisplay();
      
      // Force refresh all UI elements
      setTimeout(() => {
        forceUIRefresh();
      }, 100);
      
      // Ensure the card is visible after a brief delay to allow rendering
      setTimeout(ensureQuestionCardVisibility, 100);
    } catch (error) {
      console.error("Error displaying question:", error);
      
      // Attempt to recover by displaying a basic version of the question
      try {
        console.log("Attempting to show question in basic mode")
        const quizStage = document.querySelector(".quiz-stage")
        
        if (quizStage && questionData) {
          // Create a simplified question display
          quizStage.innerHTML = `
            <div class="question-card" style="display: block; opacity: 1;">
              <div class="question-content">
                <div class="question-topic">${questionData.topic}</div>
                <h2 class="question-text">${questionData.text}</h2>
              </div>
              
              <div class="answer-options">
                ${questionData.options.map(option => `
                  <div class="answer-option" data-option="${option.id}">
                    <div class="option-letter">${option.id}</div>
                    <div class="option-text">${option.text}</div>
                  </div>
                `).join('')}
              </div>
              
              <div class="question-actions">
                <button class="submit-button" disabled>Submit Answer</button>
              </div>
            </div>
          `
          
          // Reattach event listeners
          const newAnswerOptions = document.querySelectorAll(".answer-option")
          const newSubmitButton = document.querySelector(".submit-button")
          
          if (newAnswerOptions) {
            newAnswerOptions.forEach(option => {
              option.addEventListener("click", function() {
                newAnswerOptions.forEach(opt => opt.classList.remove("selected"))
      this.classList.add("selected")
                quizState.selectedAnswer = this.getAttribute("data-option")
                if (newSubmitButton) newSubmitButton.disabled = false
              })
            })
          }
          
          if (newSubmitButton) {
            newSubmitButton.addEventListener("click", function() {
              if (!quizState.selectedAnswer) return
              
              // Basic feedback
              const isCorrect = quizState.selectedAnswer === questionData.correctAnswer
              quizStage.innerHTML = `
                <div class="feedback-panel" style="display: block">
                  <div class="feedback-content ${isCorrect ? 'correct' : 'incorrect'}">
                    <h3 class="feedback-title">${isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                    <p class="feedback-explanation">${questionData.explanation || 'Moving to next question.'}</p>
                    <button class="next-question-button">Next Question</button>
                  </div>
                </div>
              `
              
              // Update question counter
              quizState.currentQuestion++
              const questionNumber = document.querySelector(".question-number")
              if (questionNumber) {
                questionNumber.textContent = quizState.currentQuestion
              }
              
              // Handle next button
              const nextButton = document.querySelector(".next-question-button")
              if (nextButton) {
                nextButton.addEventListener("click", function() {
                  // Get next question
                  const nextQuestion = selectNextQuestion()
                  if (nextQuestion) {
                    displayQuestion(nextQuestion)
                  } else {
                    showResults()
                  }
                })
              }
            })
          }
        }
      } catch (fallbackError) {
        console.error("Fallback display also failed:", fallbackError)
        const quizStage = document.querySelector(".quiz-stage")
        if (quizStage) {
          quizStage.innerHTML = `
            <div class="error-message">
              <h2>Error displaying question</h2>
              <p>${error.message}</p>
              <button class="cta-button primary" onclick="window.location.reload()">Reload Quiz</button>
            </div>
          `
        }
      }
    }
  }
  
  // Helper function to create a new question card with all necessary elements
  function createQuestionCard(quizStage, questionData) {
    // Get topic information
    const topicKey = questionData.topic
    const topicData = quizState.subjectTopics[topicKey] || { name: topicKey }
    const topicName = topicData.name || topicKey
    
    // Calculate difficulty level (1-5)
    const difficultyLevel = Math.ceil(questionData.difficulty * 5)
    
    // Create difficulty dots HTML
    const difficultyDotsHTML = Array.from({ length: 5 }).map((_, i) => 
      `<span class="dot ${i < difficultyLevel ? 'active' : ''}"></span>`
    ).join('')
    
    // Create options HTML
    const optionsHTML = questionData.options.map(option => `
      <div class="answer-option" data-option="${option.id}">
        <div class="option-letter">${option.id}</div>
        <div class="option-text">${option.text}</div>
      </div>
    `).join('')
    
    // Create the full question card HTML
    const questionCardHTML = `
      <div class="question-card" style="display: block; opacity: 1;">
        <div class="difficulty-indicator">
          <div class="difficulty-label">Difficulty</div>
          <div class="difficulty-dots">
            ${difficultyDotsHTML}
          </div>
        </div>
        
        <div class="question-content">
          <div class="question-topic">${topicName}</div>
          <h2 class="question-text">${questionData.text}</h2>
          <div class="question-visual">
            <!-- Visual content will be added if needed -->
          </div>
        </div>
        
        <div class="answer-options">
          ${optionsHTML}
        </div>
        
        <div class="question-actions">
          <button class="hint-button">
            <span class="hint-icon">💡</span>
            <span class="hint-text">Hint</span>
          </button>
          <button class="submit-button" disabled>Submit Answer</button>
          <button class="voice-button">
            <span class="voice-icon">🎤</span>
            <span class="voice-text">Voice</span>
          </button>
        </div>
      </div>
      
      <div class="feedback-panel hidden">
        <div class="feedback-content">
          <div class="feedback-icon"></div>
          <h3 class="feedback-title"></h3>
          <p class="feedback-explanation">
            Explanation will appear here.
          </p>
          <div class="knowledge-update">
            <div class="update-label">Ability Estimate Updated</div>
            <div class="update-visualization">
              <div class="update-from">0.0</div>
              <div class="update-arrow">→</div>
              <div class="update-to">0.0</div>
            </div>
          </div>
          <button class="next-question-button">Next Question</button>
        </div>
      </div>
    `
    
    // Set the HTML content
    quizStage.innerHTML = questionCardHTML
    
    // Add a class to the main container to indicate a question is active
    const quizContainer = document.querySelector('.quiz-container')
    if (quizContainer) {
      quizContainer.classList.add('question-active')
    }
    
    // Now update the sidebar with current topic info
    updateSidebarForQuestion(questionData)
    
    // Add event listeners to answer options
    const answerOptions = quizStage.querySelectorAll(".answer-option")
    if (answerOptions && answerOptions.length > 0) {
      answerOptions.forEach(option => {
        option.addEventListener("click", function() {
          answerOptions.forEach(opt => opt.classList.remove("selected"))
          this.classList.add("selected")
      quizState.selectedAnswer = this.getAttribute("data-option")

      // Enable submit button
          const submitButton = quizStage.querySelector(".submit-button")
          if (submitButton) submitButton.disabled = false
    })
  })
    } else {
      console.warn("No answer options found after creating question card")
    }

    // Add event listeners to buttons
    const submitButton = quizStage.querySelector(".submit-button")
  if (submitButton) {
      submitButton.addEventListener("click", handleSubmitAnswer)
    }
    
    const nextButton = quizStage.querySelector(".next-question-button")
    if (nextButton) {
      nextButton.addEventListener("click", handleNextQuestion)
    }
    
    const hintButton = quizStage.querySelector(".hint-button")
    if (hintButton) {
      hintButton.addEventListener("click", showHint)
    }
    
    const voiceButton = quizStage.querySelector(".voice-button")
    if (voiceButton) {
      voiceButton.addEventListener("click", activateVoiceRecognition)
    }
    
    // Start timer
    startTimer()
    
    // Attempt animation if GSAP is available
    try {
      if (window.gsap && window.gsap !== window.fallbackGSAP) {
        const questionCard = quizStage.querySelector(".question-card")
        if (questionCard) {
          gsap.fromTo(
            questionCard, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
          )
        }
      }
    } catch (error) {
      console.warn("Animation error:", error)
    }
  }
  
  // Helper function to update the sidebar for the current question
  function updateSidebarForQuestion(questionData) {
    if (!questionData) {
      console.warn("No question data provided to update sidebar");
      return;
    }
    
    console.log("Updating sidebar with question data:", questionData);
    
    const topicKey = questionData.topic || '';
    const topicData = quizState.subjectTopics[topicKey] || { name: topicKey };
    const topicName = topicData.name || topicKey;
    
    // Topic focus section
    const topicNameEl = document.querySelector(".topic-name");
    if (topicNameEl) {
      topicNameEl.textContent = topicName;
      console.log("Updated topic name:", topicName);
    } else {
      console.warn("Topic name element not found");
    }
    
    // Mastery bar
    const masteryFill = document.querySelector(".mastery-fill");
    const masteryPercentage = document.querySelector(".mastery-percentage");
    
    if (masteryFill && masteryPercentage && topicKey) {
      const mastery = quizState.topicMasteries[topicKey] * 100 || 0;
      const masteryWidth = `${mastery}%`;
      masteryFill.style.width = masteryWidth;
      masteryPercentage.textContent = `${Math.round(mastery)}%`;
      console.log("Updated mastery display:", masteryWidth);
    } else {
      console.warn("Mastery elements not found or topic key missing");
    }
    
    // Question stats - using explicit selectors instead of nth-child
    const difficultyValue = document.querySelector(".stat-item:nth-of-type(1) .stat-value");
    const discriminationValue = document.querySelector(".stat-item:nth-of-type(2) .stat-value");
    const timerValue = document.querySelector(".stat-item:nth-of-type(3) .stat-value");
    
    // Update difficulty
    if (difficultyValue && questionData.difficulty !== undefined) {
      const difficultyText = questionData.difficulty.toFixed(1);
      difficultyValue.textContent = difficultyText;
      console.log("Updated difficulty value:", difficultyText);
    } else {
      console.warn("Difficulty value element not found or data missing");
    }
    
    // Update discrimination
    if (discriminationValue && questionData.discrimination !== undefined) {
      const discriminationText = questionData.discrimination.toFixed(1);
      discriminationValue.textContent = discriminationText;
      console.log("Updated discrimination value:", discriminationText);
    } else {
      console.warn("Discrimination value element not found or data missing");
    }
    
    // Verify updates with log of current DOM state
    setTimeout(() => {
      const currentDifficulty = document.querySelector(".stat-item:nth-of-type(1) .stat-value")?.textContent;
      const currentDiscrimination = document.querySelector(".stat-item:nth-of-type(2) .stat-value")?.textContent;
      console.log("Current sidebar values:", {
        difficulty: currentDifficulty,
        discrimination: currentDiscrimination
      });
    }, 100);
  }

  // Define the handlers for quiz interaction
  function handleSubmitAnswer() {
    const quizStage = document.querySelector(".quiz-stage")
    if (!quizState.selectedAnswer || !quizState.currentQuestionData || !quizStage) return
    
        // Stop timer
        clearInterval(quizState.timerInterval)

    // Get the answer result
    const isCorrect = quizState.selectedAnswer === quizState.currentQuestionData.correctAnswer
    
    console.log(`Answer submitted: ${quizState.selectedAnswer}, Correct: ${isCorrect}`)
    
    // Save answer to localStorage for later reference
    try {
      localStorage.setItem(`answer_${quizState.currentQuestionData.id}`, quizState.selectedAnswer)
    } catch (error) {
      console.warn("Failed to save answer to localStorage:", error)
    }
    
    // Add to answered questions
    quizState.answeredQuestions.push(quizState.currentQuestionData.id)
    
    // Update topic mastery with Bayesian Knowledge Tracing
    const topic = quizState.currentQuestionData.topic
    const oldMastery = quizState.topicMasteries[topic] || 0.25
    const newMastery = updateTopicMastery(topic, isCorrect)
    
    // Update ability estimate with Item Response Theory
    const { oldAbility, newAbility } = updateAbilityEstimate(
      isCorrect,
      quizState.currentQuestionData.difficulty,
      quizState.currentQuestionData.discrimination
    )
    
    // DIRECT DOM UPDATE: Force an immediate update of the ability display
    const abilityValueElement = document.querySelector(".ability-value");
    const abilityFillElement = document.querySelector(".ability-fill");
    
    if (abilityValueElement) {
      abilityValueElement.textContent = quizState.abilityEstimate.toFixed(1);
      console.log("Direct DOM update of ability value:", quizState.abilityEstimate.toFixed(1));
    }
    
    if (abilityFillElement) {
      const fillWidth = `${quizState.abilityEstimate * 100}%`;
      abilityFillElement.style.width = fillWidth;
      console.log("Direct DOM update of ability fill:", fillWidth);
    }
    
    // Force refresh all UI elements
    setTimeout(() => {
      forceUIRefresh();
    }, 50);

    // Update feedback panel
    const feedbackPanel = quizStage.querySelector(".feedback-panel")
    if (!feedbackPanel) {
      console.error("Feedback panel not found")
      // Create feedback panel if it doesn't exist
      const newFeedbackPanel = document.createElement("div")
      newFeedbackPanel.className = "feedback-panel"
      newFeedbackPanel.innerHTML = `
        <div class="feedback-content ${isCorrect ? 'correct' : 'incorrect'}">
          <div class="feedback-icon">${isCorrect ? '✓' : '✗'}</div>
          <h3 class="feedback-title">${isCorrect ? 'Correct!' : 'Incorrect'}</h3>
          <p class="feedback-explanation">${quizState.currentQuestionData.explanation || 'Great job! Let\'s continue to the next question.'}</p>
          <div class="knowledge-update">
            <div class="update-label">Ability Estimate Updated</div>
            <div class="update-visualization">
              <div class="update-from">${oldAbility.toFixed(1)}</div>
              <div class="update-arrow">→</div>
              <div class="update-to">${newAbility.toFixed(1)}</div>
            </div>
          </div>
          <button class="next-question-button">Next Question</button>
        </div>
      `
      quizStage.appendChild(newFeedbackPanel)
      
      // Add event listener to the next button
      const nextButton = newFeedbackPanel.querySelector(".next-question-button")
      if (nextButton) {
        nextButton.addEventListener("click", handleNextQuestion)
      }
      
      // Show the feedback panel
      setTimeout(() => {
        newFeedbackPanel.classList.remove("hidden")
      }, 50)
    } else {
      // Update existing feedback panel
      const feedbackContent = feedbackPanel.querySelector(".feedback-content")
      const feedbackIcon = feedbackPanel.querySelector(".feedback-icon")
      const feedbackTitle = feedbackPanel.querySelector(".feedback-title")
      const feedbackExplanation = feedbackPanel.querySelector(".feedback-explanation")
      const updateFrom = feedbackPanel.querySelector(".update-from")
      const updateTo = feedbackPanel.querySelector(".update-to")
    
    if (feedbackContent) {
        feedbackContent.className = `feedback-content ${isCorrect ? 'correct' : 'incorrect'}`
    }
    
    if (feedbackIcon) {
      feedbackIcon.textContent = isCorrect ? "✓" : "✗"
    }
    
    if (feedbackTitle) {
      feedbackTitle.textContent = isCorrect ? "Correct!" : "Incorrect"
    }
    
    if (feedbackExplanation) {
      feedbackExplanation.textContent = quizState.currentQuestionData.explanation || 
        "Great job! Let's continue to the next question."
    }

        if (updateFrom && updateTo) {
          updateFrom.textContent = oldAbility.toFixed(1)
      updateTo.textContent = newAbility.toFixed(1)
    }
    
    // Show feedback panel
      feedbackPanel.classList.remove("hidden")
      
      // Ensure the next button has event listener
      const nextButton = feedbackPanel.querySelector(".next-question-button")
      if (nextButton) {
        // Clone and replace to ensure clean event listener
        const newNextButton = nextButton.cloneNode(true)
        nextButton.parentNode.replaceChild(newNextButton, nextButton)
        newNextButton.addEventListener("click", handleNextQuestion)
      }
    }
    
    // Update ability display
    updateAbilityDisplay()

        // Update performance chart
    if (window.performanceChart) {
      try {
        // Track ability estimate history
        if (!quizState.abilityHistory) {
          quizState.abilityHistory = [0]; // Start with initial value
        }
        
        // Add new value to history
        quizState.abilityHistory.push(quizState.abilityEstimate);
        console.log("Ability history updated:", quizState.abilityHistory);
        
        // Update the chart with the current history
        window.performanceChart.data.labels = quizState.abilityHistory.map((_, i) => `Q${i}`);
        window.performanceChart.data.datasets[0].data = [...quizState.abilityHistory];
        
        // Force update with animation disabled for performance
        window.performanceChart.update('none');
        console.log("Performance chart updated successfully");
      } catch (error) {
        console.warn("Error updating performance chart:", error);
        
        // Try to recreate the chart after a short delay
        setTimeout(() => {
          try {
            if (document.getElementById("performanceChart")) {
              initializeResultsCharts();
            }
          } catch (e) {
            console.error("Failed to recreate performance chart:", e);
          }
        }, 100);
      }
    } else {
      console.warn("Performance chart not available for update");
      
      // Try to initialize the chart
      setTimeout(() => {
        if (document.getElementById("performanceChart") && window.Chart) {
          try {
            initializeResultsCharts();
            console.log("Performance chart initialized");
          } catch (e) {
            console.error("Failed to initialize performance chart:", e);
          }
        }
      }, 100);
    }
    
    // Update knowledge map
    updateKnowledgeMap()
    
    // Set questionChanged to true to update Thompson sampling for next question
    quizState.questionChanged = true
  }
  
  function handleNextQuestion() {
    console.log("handleNextQuestion called");
    
    // Hide feedback panel
    const feedbackPanel = document.querySelector(".feedback-panel");
    if (feedbackPanel) {
      feedbackPanel.classList.add("hidden");
      // Optionally remove it from DOM to avoid interaction issues
      setTimeout(() => {
        if (feedbackPanel.parentNode) {
          feedbackPanel.parentNode.removeChild(feedbackPanel);
        }
      }, 300);
    } else {
      console.warn("Feedback panel not found when trying to hide it");
    }

    // Increment question number
    quizState.currentQuestion++;

    // Update question number display
    const questionNumber = document.querySelector(".question-number");
    if (questionNumber) {
      questionNumber.textContent = quizState.currentQuestion;
    }

    // Update the current question counter display
    const currentQuestionDisplay = document.querySelector(".current-question");
    if (currentQuestionDisplay) {
      currentQuestionDisplay.textContent = quizState.currentQuestion;
    }

    // Force a complete UI refresh, including ability display
    forceUIRefresh();

    // Check if quiz is complete
    if (quizState.currentQuestion > quizState.totalQuestions || quizState.answeredQuestions.length >= quizState.questions.length) {
      console.log("Quiz is complete, showing results");
      showResults();
      return;
    }
    
    // Log current state for debugging
    console.log(`Moving to question ${quizState.currentQuestion}`, {
      answeredQuestions: quizState.answeredQuestions.length,
      abilityEstimate: quizState.abilityEstimate.toFixed(2),
      remainingQuestions: quizState.questions.length - quizState.answeredQuestions.length
    });
    
    // Select next question
    const nextQuestion = selectNextQuestion();
    
    if (nextQuestion) {
      console.log("Selected next question:", nextQuestion.id);
      
      // Clear any previous question
      const quizStage = document.querySelector(".quiz-stage");
      if (quizStage) {
        // Remove all child elements except feedback panel (which we already handled above)
        Array.from(quizStage.children).forEach(child => {
          if (!child.classList.contains("feedback-panel")) {
            child.remove();
          }
        });
      }
      
      // Display the next question
      displayQuestion(nextQuestion);
    } else {
      // No more questions available, show results
      console.log("No more questions available, showing results");
      showResults();
    }
  }
  
  function showHint() {
    if (!quizState.currentQuestionData) return
    
    // Create hint text based on current question
    let hintText = "Think about what the question is asking..."
    
    // Try to generate a more specific hint based on the question type
    const questionTopic = quizState.currentQuestionData.topic
    const correctAnswer = quizState.currentQuestionData.correctAnswer
    
    if (questionTopic === "algebra") {
      hintText = "Remember to isolate the variable on one side of the equation."
    } else if (questionTopic === "geometry") {
      hintText = "Consider the properties of the shape mentioned in the question."
    } else if (questionTopic === "physics") {
      hintText = "Think about the relevant physical laws that apply to this scenario."
    } else if (questionTopic === "chemistry") {
      hintText = "Consider the chemical properties and reactions involved."
    } else if (questionTopic === "biology") {
      hintText = "Think about the biological processes or structures mentioned."
    }
    
    // Create hint popup
      const hintPopup = document.createElement("div")
      hintPopup.className = "hint-popup"
      hintPopup.innerHTML = `
                <div class="hint-content">
                    <h3>Hint</h3>
        <p>${hintText}</p>
                    <button class="hint-close">Got it</button>
                </div>
            `
      document.body.appendChild(hintPopup)

    // Animate hint popup if GSAP is available
    try {
      if (window.gsap && window.gsap !== window.fallbackGSAP) {
        gsap.fromTo(
          hintPopup, 
          { opacity: 0, scale: 0.9 }, 
          { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }
        )
      } else {
        hintPopup.style.opacity = "1"
      }
    } catch (error) {
      console.warn("Error animating hint popup:", error)
      hintPopup.style.opacity = "1"
    }

      // Handle hint close button
      const hintClose = hintPopup.querySelector(".hint-close")
      if (hintClose) {
        hintClose.addEventListener("click", () => {
        try {
          if (window.gsap && window.gsap !== window.fallbackGSAP) {
          gsap.to(hintPopup, {
            opacity: 0,
            scale: 0.9,
            duration: 0.3,
            ease: "power3.in",
            onComplete: () => {
              hintPopup.remove()
            },
          })
          } else {
            hintPopup.remove()
          }
        } catch (error) {
          console.warn("Error animating hint popup close:", error)
          hintPopup.remove()
        }
      })
    }
  }
  
  function activateVoiceRecognition() {
    if (!quizState.currentQuestionData) return
    
    // Create voice popup
      const voicePopup = document.createElement("div")
      voicePopup.className = "voice-popup"
      voicePopup.innerHTML = `
                <div class="voice-content">
                    <h3>Voice Recognition</h3>
                    <p>Listening for your answer...</p>
                    <div class="voice-visualizer">
                        <div class="voice-bar"></div>
                        <div class="voice-bar"></div>
                        <div class="voice-bar"></div>
                        <div class="voice-bar"></div>
                        <div class="voice-bar"></div>
                    </div>
                    <button class="voice-cancel">Cancel</button>
                </div>
            `
      document.body.appendChild(voicePopup)

    // Show the popup
    try {
      if (window.gsap && window.gsap !== window.fallbackGSAP) {
        gsap.fromTo(
          voicePopup, 
          { opacity: 0, scale: 0.9 }, 
          { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }
        )

      // Animate voice bars
      const voiceBars = voicePopup.querySelectorAll(".voice-bar")
      voiceBars.forEach((bar) => {
        gsap.to(bar, {
            height: window.gsap.utils.random(10, 40),
          duration: 0.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
            delay: window.gsap.utils.random(0, 0.5),
          })
        })
      } else {
        voicePopup.style.opacity = "1"
      }
    } catch (error) {
      console.warn("Error animating voice popup:", error)
      voicePopup.style.opacity = "1"
    }

      // Simulate voice recognition result after 3 seconds
      setTimeout(() => {
      // Get current question options to pick from
      const options = quizState.currentQuestionData.options
      const randomIndex = Math.floor(Math.random() * options.length)
      const randomOption = options[randomIndex].id
      
      // Select an answer
      quizState.selectedAnswer = randomOption
      
      // Update UI to show selected answer
      const answerOptions = document.querySelectorAll(".answer-option")
      if (answerOptions) {
        answerOptions.forEach((opt) => {
          if (opt.getAttribute("data-option") === randomOption) {
            opt.classList.add("selected")
          } else {
            opt.classList.remove("selected")
          }
        })
      }

        // Close voice popup
      try {
        if (window.gsap && window.gsap !== window.fallbackGSAP) {
        gsap.to(voicePopup, {
          opacity: 0,
          scale: 0.9,
          duration: 0.3,
          ease: "power3.in",
          onComplete: () => {
            voicePopup.remove()
          },
        })
        } else {
          voicePopup.remove()
        }
      } catch (error) {
        console.warn("Error animating voice popup close:", error)
        voicePopup.remove()
      }

        // Enable submit button
      const submitButton = document.querySelector(".submit-button")
      if (submitButton) {
        submitButton.disabled = false
      }
      }, 3000)

      // Handle voice cancel button
      const voiceCancel = voicePopup.querySelector(".voice-cancel")
      if (voiceCancel) {
        voiceCancel.addEventListener("click", () => {
        try {
          if (window.gsap && window.gsap !== window.fallbackGSAP) {
          gsap.to(voicePopup, {
            opacity: 0,
            scale: 0.9,
            duration: 0.3,
            ease: "power3.in",
            onComplete: () => {
              voicePopup.remove()
            },
          })
          } else {
            voicePopup.remove()
          }
        } catch (error) {
          console.warn("Error animating voice popup close:", error)
          voicePopup.remove()
        }
      })
    }
  }

  // Update knowledge map based on topic masteries
  function updateKnowledgeMap() {
    const mapNodes = document.querySelectorAll(".map-node")
    
    if (!mapNodes || mapNodes.length === 0) {
      console.warn("No map nodes found for knowledge map")
      return
    }
    
    mapNodes.forEach(node => {
      const topic = node.getAttribute("data-topic")
      if (topic && quizState.topicMasteries[topic] !== undefined) {
        const mastery = quizState.topicMasteries[topic]
        const nodeFill = node.querySelector(".node-fill")
        
        if (nodeFill) {
          nodeFill.style.height = `${mastery * 100}%`
          nodeFill.style.opacity = 0.3 + mastery * 0.7
        }
      }
    })
  }

  // Show results overlay
  async function showResults() {
    // Get the results overlay element
    const resultsOverlay = document.querySelector(".results-overlay");
    const closeResults = document.querySelector(".close-results");
    
    if (!resultsOverlay) {
      console.error("Results overlay element not found");
      return;
    }
    
    try {
      console.log("Showing quiz results:", {
        answeredQuestions: quizState.answeredQuestions.length,
        abilityEstimate: quizState.abilityEstimate,
        topicMasteries: quizState.topicMasteries
      });
      
      // Stop the timer when showing results
      clearInterval(quizState.timerInterval);
      
      // First ensure Chart.js is loaded
      await ensureChartJsLoaded();
      
      // Initialize results charts first to ensure radar chart availability
      // Clear any existing charts
      if (window.radarChart) {
        window.radarChart.destroy();
        window.radarChart = null;
      }
      
      initializeResultsCharts();
      
      // Create the enhanced results content with SVG icons
      createEnhancedResults();
      
      // Show results overlay
      resultsOverlay.classList.remove("hidden");
      console.log("Results overlay displayed");

      // Create standalone knowledge map - guaranteed to work
      createStandaloneKnowledgeMap();
      
      // Update knowledge radar chart again for good measure
      setTimeout(() => {
        const radarContainer = document.querySelector(".knowledge-radar");
        const radarChart = window.radarChart;
        
        // Force radarContainer to be visible
        if (radarContainer) {
          radarContainer.style.height = '400px';
          radarContainer.style.width = '100%';
          radarContainer.style.display = 'block';
          radarContainer.style.visibility = 'visible';
          radarContainer.style.opacity = '1';
        }
        
        if (radarChart) {
          try {
            radarChart.resize();
            radarChart.update();
            console.log("Radar chart updated");
          } catch (error) {
            console.warn("Error updating radar chart:", error);
          }
        } else {
          console.warn("Radar chart not available, already handled with standalone map");
        }
      }, 300);
      
      // Create confetti effect
      createConfetti();
      
      // Add close results button event if not already added
      if (closeResults && !closeResults._hasEventListener) {
        closeResults.addEventListener("click", () => {
            resultsOverlay.classList.add("hidden");
            window.location.href = "index.html";
        });
        closeResults._hasEventListener = true;
      }
    } catch (error) {
      console.error("Error showing results:", error);
      
      // Fallback: Display a simple alert with basic results
      alert(`Quiz Complete!\nFinal Score: ${(quizState.abilityEstimate * 10).toFixed(1)} / 10\nQuestions Answered: ${quizState.answeredQuestions.length}`);
    }
  }

  // Add a 3D trophy animation to the results container
  function addTrophyAnimation() {
    const resultsContainer = document.querySelector(".results-container");
    if (!resultsContainer || resultsContainer.querySelector(".trophy-container")) return;
    
    // Get the user's performance
    const abilityScore = Math.round(quizState.abilityEstimate * 10);
    
    // Calculate a grade based on ability score
    let grade = "C";
    if (abilityScore >= 9) grade = "A+";
    else if (abilityScore >= 8) grade = "A";
    else if (abilityScore >= 7) grade = "B+";
    else if (abilityScore >= 6) grade = "B";
    else if (abilityScore >= 5) grade = "C+";
    
    // Only show trophy for good grades
    if (abilityScore >= 6) {
      const trophyContainer = document.createElement("div");
      trophyContainer.className = "trophy-container";
      trophyContainer.innerHTML = `
        <div class="trophy">
          <div class="trophy-cup"></div>
          <div class="trophy-base"></div>
          <div class="trophy-handles">
            <div class="trophy-handle-left"></div>
            <div class="trophy-handle-right"></div>
          </div>
          <div class="trophy-plate">${grade}</div>
        </div>
      `;
      
      // Prepend the trophy to the results container
      resultsContainer.prepend(trophyContainer);
    }
  }

  // Add personalized recommendations based on performance
  function addRecommendations() {
    const resultsContainer = document.querySelector(".results-container");
    if (!resultsContainer) return;
    
    // Check if recommendations already exist
    if (resultsContainer.querySelector(".recommendations-section")) return;
    
    // Find the topic breakdown section
    const topicBreakdown = resultsContainer.querySelector(".topic-breakdown");
    if (!topicBreakdown) return;
    
    // Get performance data
    const abilityScore = quizState.abilityEstimate * 10;
    
    // Calculate weakest topics
    const topicEntries = Object.entries(quizState.topicMasteries);
    topicEntries.sort((a, b) => a[1] - b[1]); // Sort by mastery (ascending)
    
    const weakestTopics = topicEntries.slice(0, 2).map(([key, value]) => {
      return {
        topic: quizState.subjectTopics[key]?.name || key,
        mastery: value
      };
    });
    
    // Create recommendations section
    const recommendationsSection = document.createElement("div");
    recommendationsSection.className = "recommendations-section";
    
    // Set recommendations content
    recommendationsSection.innerHTML = `
      <h3 class="recommendations-title">Personalized Recommendations</h3>
      
      <div class="recommendation-card">
        <div class="recommendation-icon">📊</div>
        <div class="recommendation-content">
          <h4 class="recommendation-title">Overall Performance</h4>
          <p class="recommendation-description">
            Your ability score is ${abilityScore.toFixed(1)}/10. 
            ${abilityScore >= 8 ? 
              "Excellent work! Consider challenging yourself with more advanced topics." : 
              abilityScore >= 6 ? 
              "Good progress! Focus on strengthening your understanding of core concepts." : 
              "Keep practicing! Revisit fundamental concepts to build a stronger foundation."}
          </p>
        </div>
      </div>
    `;
    
    // Add recommendations for weak topics if available
    if (weakestTopics.length > 0 && weakestTopics[0].mastery < 0.7) {
      const topicCard = document.createElement("div");
      topicCard.className = "recommendation-card";
      topicCard.innerHTML = `
        <div class="recommendation-icon">🎯</div>
        <div class="recommendation-content">
          <h4 class="recommendation-title">Focus Areas</h4>
          <p class="recommendation-description">
            Concentrate on improving your knowledge in ${weakestTopics[0].topic}
            ${weakestTopics.length > 1 ? ` and ${weakestTopics[1].topic}` : ''}.
            These areas have the most room for growth in your current knowledge profile.
          </p>
        </div>
      `;
      recommendationsSection.appendChild(topicCard);
    }
    
    // Add study strategy recommendation
    const strategyCard = document.createElement("div");
    strategyCard.className = "recommendation-card";
    strategyCard.innerHTML = `
      <div class="recommendation-icon">📝</div>
      <div class="recommendation-content">
        <h4 class="recommendation-title">Study Strategy</h4>
        <p class="recommendation-description">
          ${abilityScore >= 7 ? 
            "Practice with more challenging questions and explore advanced topics to push your boundaries." : 
            abilityScore >= 5 ? 
            "Balance your study time between reviewing familiar concepts and introducing new challenging material." : 
            "Focus on mastering fundamental concepts before moving to more advanced topics."}
        </p>
      </div>
    `;
    recommendationsSection.appendChild(strategyCard);
    
    // Insert recommendations section before the actions section
    const actionsSection = resultsContainer.querySelector(".results-actions");
    if (actionsSection) {
      resultsContainer.insertBefore(recommendationsSection, actionsSection);
    } else {
      resultsContainer.appendChild(recommendationsSection);
    }
  }

  // Enhance the createEnhancedResults function to include the new features
  function createEnhancedResults() {
    // Get the container for the results
    const resultsContainer = document.querySelector(".results-container");
    if (!resultsContainer) return;
    
    console.log("Creating enhanced results with knowledge map");
    
    // Add background patterns/gradients
    if (!resultsContainer.querySelector(".results-bg")) {
      const resultsBg = document.createElement("div");
      resultsBg.className = "results-bg";
      resultsContainer.appendChild(resultsBg);
    }
    
    // Add trophy animation based on performance
    addTrophyAnimation();
    
    // Update final data in results summary items
    updateResultsSummaryWithIcons();
    
    // Add circular progress to summary items
    addCircularProgressToSummary();
    
    // Update topic breakdown with icons
    updateTopicBreakdownWithIcons();
    
    // Add achievement badges based on performance
    addAchievementBadges();
    
    // Add personalized recommendations
    addRecommendations();
    
    // Force the radar chart to initialize if it hasn't already
    if (!window.radarChart || !window.radarChart.data) {
      console.log("Radar chart not found, initializing now");
      initializeResultsCharts();
    }
    
    // Make sure the knowledge radar is given priority
    const knowledgeRadar = document.querySelector('.knowledge-radar');
    if (knowledgeRadar) {
      // Explicitly set its dimensions and visibility
      knowledgeRadar.style.height = '400px';
      knowledgeRadar.style.minHeight = '400px';
      knowledgeRadar.style.width = '100%';
      knowledgeRadar.style.display = 'block';
      knowledgeRadar.style.visibility = 'visible';
      knowledgeRadar.style.opacity = '1';
      
      // Force rebuild of the knowledge map
      if (knowledgeRadar.querySelector('.results-knowledge-map')) {
        knowledgeRadar.removeChild(knowledgeRadar.querySelector('.results-knowledge-map'));
      }
    }
    
    // Add circular progress to the radar chart and create interactive knowledge map
    enhanceRadarChart();
    
    // Fallback for knowledge map if it wasn't created by enhanceRadarChart
    setTimeout(() => {
      const knowledgeRadar = document.querySelector('.knowledge-radar');
      if (knowledgeRadar && !knowledgeRadar.querySelector('.results-knowledge-map')) {
        console.log("Fallback: Creating knowledge map directly");
        
        // Create a dummy data structure if the radar chart isn't available
        if (!window.radarChart || !window.radarChart.data) {
          window.radarChart = {
            data: {
              labels: ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
              datasets: [{
                data: [0.5, 0.7, 0.4, 0.6, 0.3]
              }]
            }
          };
        }
        
        addInteractiveKnowledgeMap(knowledgeRadar);
      }
    }, 500);
    
    // Set up achievements guide functionality
    setupAchievementsGuide();
  }

  // Update summary items with SVG icons
  function updateResultsSummaryWithIcons() {
    // First get all the summary values
    const finalAbilityValue = document.querySelector(".results-container .summary-item:nth-child(1) .summary-value");
    const questionsAnsweredValue = document.querySelector(".results-container .summary-item:nth-child(2) .summary-value");
    const accuracyValue = document.querySelector(".results-container .summary-item:nth-child(3) .summary-value");
    const totalTimeValue = document.querySelector(".results-container .summary-item:nth-child(4) .summary-value");
    
    // Get all the summary icons
    const abilityIcon = document.querySelector(".results-container .summary-item:nth-child(1) .summary-icon");
    const questionsIcon = document.querySelector(".results-container .summary-item:nth-child(2) .summary-icon");
    const accuracyIcon = document.querySelector(".results-container .summary-item:nth-child(3) .summary-icon");
    const timeIcon = document.querySelector(".results-container .summary-item:nth-child(4) .summary-icon");
    
    // Update the values
    if (finalAbilityValue) {
      // Scale ability estimate from 0-1 to 0-10 range for display
      const scaledAbility = (quizState.abilityEstimate * 10).toFixed(1);
      finalAbilityValue.textContent = scaledAbility;
      console.log("Updated ability display:", scaledAbility);
    }
    
    if (questionsAnsweredValue) {
      questionsAnsweredValue.textContent = quizState.answeredQuestions.length;
    }
    
    // Calculate accuracy
    let correctAnswers = 0;
    let accuracy = 0;
    
    if (accuracyValue) {
      // Count correct answers
      quizState.answeredQuestions.forEach(id => {
        const question = quizState.questions.find(q => q.id === id);
        const userAnswer = localStorage.getItem(`answer_${id}`);
        if (question && userAnswer === question.correctAnswer) {
          correctAnswers++;
        }
      });
      
      accuracy = (quizState.answeredQuestions.length > 0) 
        ? (correctAnswers / quizState.answeredQuestions.length * 100) 
        : 0;
      
      accuracyValue.textContent = `${Math.round(accuracy)}%`;
    }
    
    // Format total time - use totalTime for accurate measurement
    if (totalTimeValue) {
      // Use the stored totalTime instead of timer for more accurate measurement
      // If totalTime is not available, fall back to timer
      const totalSeconds = quizState.totalTime || quizState.timer;
      
      // For longer quizzes, include hours
      let timeDisplay = "";
      
      if (totalSeconds >= 3600) {
        // Format as HH:MM:SS
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        timeDisplay = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      } else {
        // Format as MM:SS
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      
      totalTimeValue.textContent = timeDisplay;
      console.log(`Total quiz time: ${timeDisplay} (${totalSeconds} seconds)`);
    }
    
    // Add SVG icons (if not already added)
    if (abilityIcon && !abilityIcon.querySelector("svg")) {
      abilityIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
            fill="#6E44FF" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    
    if (questionsIcon && !questionsIcon.querySelector("svg")) {
      questionsIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" 
            stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 12H15" stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 16H15" stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 16H9.01" stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 12H9.01" stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 3V7" stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 7H15" stroke="#48BEFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    
    if (accuracyIcon && !accuracyIcon.querySelector("svg")) {
      accuracyIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" 
            stroke="#2ECC71" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="#2ECC71" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
    
    if (timeIcon && !timeIcon.querySelector("svg")) {
      timeIcon.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
            stroke="#FF9800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 6V12L16 14" stroke="#FF9800" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }

  // Update topic breakdown with icons
  function updateTopicBreakdownWithIcons() {
    const topicList = document.querySelector(".topic-list");
    if (!topicList) return;
    
    // Get topic items
    const topicItems = topicList.querySelectorAll(".topic-item");
    
    // Add topic icons if not already present
    topicItems.forEach(item => {
      // Check if icon already exists
      if (!item.querySelector(".topic-icon")) {
        const topicIcon = document.createElement("div");
        topicIcon.className = "topic-icon";
        
        // Get topic name to determine which icon to show
        const topicNameEl = item.querySelector(".topic-name");
        const topicName = topicNameEl ? topicNameEl.textContent.toLowerCase() : "";
        
        // Choose icon based on topic
        let iconContent = "📚"; // Default
        
        if (topicName.includes("algebra")) {
          iconContent = "∫";
        } else if (topicName.includes("geometry")) {
          iconContent = "△";
        } else if (topicName.includes("calculus")) {
          iconContent = "∑";
        } else if (topicName.includes("statistics")) {
          iconContent = "σ";
        } else if (topicName.includes("programming")) {
          iconContent = "{ }";
        } else if (topicName.includes("physics")) {
          iconContent = "⚛";
        } else if (topicName.includes("chemistry")) {
          iconContent = "⚗";
        } else if (topicName.includes("biology")) {
          iconContent = "🧬";
        }
        
        topicIcon.textContent = iconContent;
        item.appendChild(topicIcon);
      }
    });
  }

  // Add achievement badges based on performance
  function addAchievementBadges() {
    // Get performance metrics
    const abilityScore = quizState.abilityEstimate * 10; // Scale to 0-10
    
    // Calculate accuracy
    let correctAnswers = 0;
    quizState.answeredQuestions.forEach(id => {
      const question = quizState.questions.find(q => q.id === id);
      const userAnswer = localStorage.getItem(`answer_${id}`);
      if (question && userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const accuracy = (quizState.answeredQuestions.length > 0) 
      ? (correctAnswers / quizState.answeredQuestions.length * 100) 
      : 0;
    
    // Define badges to display based on performance
    let earnedBadges = [];
    
    // Check for Genius badge
    if (abilityScore >= 7.5) {
      earnedBadges.push('genius');
    }
    
    // Check for Sharpshooter badge
    if (accuracy >= 90 && quizState.answeredQuestions.length >= 5) {
      earnedBadges.push('sharpshooter');
    }
    
    // Check for Speed Demon badge - use accurate total time
    const totalSeconds = quizState.totalTime || quizState.timer;
    const averageTimePerQuestion = totalSeconds / Math.max(1, quizState.answeredQuestions.length);
    
    // Speed Demon if average time per question is under 30 seconds with good accuracy
    if (averageTimePerQuestion < 30 && quizState.answeredQuestions.length >= 5 && accuracy >= 70) {
      earnedBadges.push('speedDemon');
      console.log(`Speed Demon badge earned: ${totalSeconds}s total, ${averageTimePerQuestion.toFixed(1)}s per question`);
    }
    
    // Check for consecutive correct answers for Hot Streak badge
    let maxConsecutiveCorrect = 0;
    let currentStreak = 0;
    quizState.answeredQuestions.forEach(id => {
      const question = quizState.questions.find(q => q.id === id);
      const userAnswer = localStorage.getItem(`answer_${id}`);
      if (question && userAnswer === question.correctAnswer) {
        currentStreak++;
        maxConsecutiveCorrect = Math.max(maxConsecutiveCorrect, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    if (maxConsecutiveCorrect >= 5) {
      earnedBadges.push('hotStreak');
    }
    
    // Check for Champion badge
    if (accuracy === 100 && quizState.questions.some(q => q.difficulty > 1.5) && quizState.answeredQuestions.length >= 5) {
      earnedBadges.push('champion');
    }
    
    // Update badges in achievements section
    const achievementBadges = document.querySelectorAll('.achievement-badge');
    if (achievementBadges && achievementBadges.length > 0) {
      achievementBadges.forEach(badge => {
        const badgeType = badge.getAttribute('data-badge');
        if (earnedBadges.includes(badgeType)) {
          badge.classList.remove('locked');
          
          // If this is a new badge earned (determined by presence of a class), show notification
          if (!badge.classList.contains('earned')) {
            badge.classList.add('earned');
            showAchievementNotification(badgeType);
          }
        } else {
          badge.classList.add('locked');
        }
      });
    }
    
    return earnedBadges;
  }
  
  // Show achievement notification
  function showAchievementNotification(badgeType) {
    const notification = document.querySelector('.achievement-notification');
    if (!notification) return;
    
    // Configure notification based on badge type
    const badgeInfo = {
      'genius': {
        icon: '🧠',
        title: 'Genius',
        message: 'Exceptional ability estimate achieved!'
      },
      'sharpshooter': {
        icon: '🎯',
        title: 'Sharpshooter',
        message: 'Impressive accuracy on your answers!'
      },
      'speedDemon': {
        icon: '⚡',
        title: 'Speed Demon',
        message: 'Fast completion with excellent accuracy!'
      },
      'hotStreak': {
        icon: '🔥',
        title: 'Hot Streak',
        message: 'Multiple consecutive correct answers!'
      },
      'champion': {
        icon: '🏆',
        title: 'Champion',
        message: 'Perfect performance on a challenging quiz!'
      },
      'scholar': {
        icon: '📚',
        title: 'Scholar',
        message: 'High scores across multiple topics!'
      }
    };
    
    const info = badgeInfo[badgeType] || {
      icon: '🎖️',
      title: 'Achievement Unlocked',
      message: 'You\'ve earned a new badge!'
    };
    
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationTitle = notification.querySelector('.notification-title');
    const notificationMessage = notification.querySelector('.notification-message');
    
    if (notificationIcon) notificationIcon.textContent = info.icon;
    if (notificationTitle) notificationTitle.textContent = info.title;
    if (notificationMessage) notificationMessage.textContent = info.message;
    
    // Show notification
    notification.classList.add('visible');
    
    // Hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('visible');
    }, 5000);
  }
  
  // Set up achievements guide
  function setupAchievementsGuide() {
    const achievementsButton = document.querySelector('.achievements-button');
    const achievementsGuide = document.querySelector('.achievements-guide');
    const guideClose = document.querySelector('.guide-close');
    
    if (achievementsButton && achievementsGuide) {
      achievementsButton.addEventListener('click', () => {
        achievementsGuide.classList.add('visible');
      });
    }
    
    if (guideClose && achievementsGuide) {
      guideClose.addEventListener('click', () => {
        achievementsGuide.classList.remove('visible');
      });
      
      // Close when clicking outside the guide container
      achievementsGuide.addEventListener('click', (e) => {
        if (e.target === achievementsGuide) {
          achievementsGuide.classList.remove('visible');
        }
      });
    }
  }

  // Create confetti animation
  function createConfetti() {
    const resultsOverlay = document.querySelector(".results-overlay");
    if (!resultsOverlay) return;
    
    // Check if confetti container already exists
    if (resultsOverlay.querySelector(".confetti-container")) return;
    
    // Create confetti container
    const confettiContainer = document.createElement("div");
    confettiContainer.className = "confetti-container";
    resultsOverlay.appendChild(confettiContainer);
    
    // Create confetti pieces
    const colors = ["#6E44FF", "#FF44E3", "#44CAFF", "#FFC107", "#2ECC71"];
    const shapes = ["circle", "square", "triangle"];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      
      // Random properties
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const left = Math.random() * 100 + "vw";
      const size = Math.random() * 10 + 5 + "px";
      
      // Set styles
      confetti.style.backgroundColor = color;
      confetti.style.left = left;
      confetti.style.width = size;
      confetti.style.height = size;
      confetti.style.opacity = Math.random() * 0.6 + 0.4;
      
      // Set shape
      if (shape === "circle") {
        confetti.style.borderRadius = "50%";
      } else if (shape === "triangle") {
        confetti.style.width = "0";
        confetti.style.height = "0";
        confetti.style.backgroundColor = "transparent";
        confetti.style.borderLeft = `${parseInt(size)/2}px solid transparent`;
        confetti.style.borderRight = `${parseInt(size)/2}px solid transparent`;
        confetti.style.borderBottom = `${size} solid ${color}`;
      }
      
      // Set animation
      const fallDuration = Math.random() * 3 + 2 + "s";
      const shakeDuration = Math.random() * 2 + 2 + "s";
      const fallDelay = Math.random() * 3 + "s";
      const shakeDelay = Math.random() * 3 + "s";
      
      confetti.style.animationDuration = `${fallDuration}, ${shakeDuration}`;
      confetti.style.animationDelay = `${fallDelay}, ${shakeDelay}`;
      
      // Add to container
      confettiContainer.appendChild(confetti);
    }
  }

  // Reset quiz state
  function resetQuiz() {
    quizState.currentQuestion = 1
    quizState.abilityEstimate = 0.0
    quizState.selectedAnswer = null

    // Update displays
    questionNumber.textContent = quizState.currentQuestion
    updateAbilityDisplay()

    // Reset answer options
    answerOptions.forEach((opt) => opt.classList.remove("selected"))

    // Reset performance chart
    if (performanceChart) {
    performanceChart.data.labels = ["Q1"]
    performanceChart.data.datasets[0].data = [0]
    performanceChart.update()
    }

    // Start timer
    startTimer()
  }

  // Initialize quiz UI animations
  function initQuizAnimations() {
    if (!window.gsap) {
      console.warn("GSAP library not available for animations")
      return
    }
    
    try {
      // Animate map nodes with safety checks
    const mapNodes = document.querySelectorAll(".map-node .node-fill")
      if (mapNodes && mapNodes.length > 0) {
    mapNodes.forEach((node) => {
          try {
      gsap.to(node, {
        scale: 1.2,
        boxShadow: "0 0 30px rgba(110, 68, 255, 0.7)",
        duration: gsap.utils.random(2, 4),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: gsap.utils.random(0, 2),
      })
          } catch (error) {
            console.warn("GSAP node animation error:", error)
          }
    })
      }

      // Animate map connections with safety checks
    const mapConnections = document.querySelectorAll(".map-connection")
      if (mapConnections && mapConnections.length > 0) {
    mapConnections.forEach((connection) => {
          try {
      gsap.to(connection, {
        strokeDashoffset: 20,
        duration: 10,
        repeat: -1,
        ease: "linear",
      })
          } catch (error) {
            console.warn("GSAP connection animation error:", error)
          }
        })
      }

      // Animate question card entrance with safety checks
      const questionCard = document.querySelector(".question-card")
      if (questionCard) {
        try {
          gsap.from(questionCard, {
      opacity: 0,
      y: 50,
      duration: 1,
      ease: "power3.out",
    })
        } catch (error) {
          console.warn("GSAP question card animation error:", error)
          // Fallback without animation
          questionCard.style.opacity = 1
          questionCard.style.transform = "translateY(0px)"
        }
      }

      // Animate sidebar entrance with safety checks
      const sidebar = document.querySelector(".quiz-sidebar")
      if (sidebar) {
        try {
          gsap.from(sidebar, {
      opacity: 0,
      x: 50,
      duration: 1,
      ease: "power3.out",
    })
        } catch (error) {
          console.warn("GSAP sidebar animation error:", error)
          // Fallback without animation
          sidebar.style.opacity = 1
          sidebar.style.transform = "translateX(0px)"
        }
      }
    } catch (error) {
      console.error("Error initializing quiz animations:", error)
    }
  }

  // Initialize and start the quiz
  async function initQuiz() {
    console.log(`Initializing quiz for subject: ${quizState.selectedSubject}`);
    
    try {
      // Set the page title based on the subject
      document.title = `QUIZ'A - ${quizState.selectedSubject.replace('-', ' ')} Quiz`;
      
      // Reset state
      quizState.selectedAnswer = null;
      quizState.currentQuestion = 1;
      quizState.answeredQuestions = [];
      quizState.questionChanged = true; // Force recalculation of topic samples on first question
      
      // Update UI elements
      const questionNumber = document.querySelector(".question-number");
      if (questionNumber) {
        questionNumber.textContent = quizState.currentQuestion;
      }
      
      // Ensure ability display is initialized correctly on page load
      setTimeout(() => {
        updateAbilityDisplay();
        console.log("Initial ability display updated:", quizState.abilityEstimate);
      }, 100);
      
      // Only show loading state when questions haven't been loaded yet
      const quizStage = document.querySelector(".quiz-stage");
      if (quizStage && (!quizState.questions || quizState.questions.length === 0)) {
        quizStage.innerHTML = `
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading ${quizState.selectedSubject.replace("-", " ")} questions...</p>
          </div>
        `;
      }
      
      // Update sidebar topic initially
      updateSidebarForQuestion({ topic: '', difficulty: 0.5, discrimination: 0.75 });
      
      // Load questions (with debounce to prevent multiple loads)
      if (!quizState.questionsLoading) {
        quizState.questionsLoading = true;
        
        // Set debounce to release lock if loading takes too long
        setTimeout(() => {
          quizState.questionsLoading = false;
        }, 10000);
        
        const success = await loadQuestions();
        quizState.questionsLoading = false;
        
        if (!success) {
          console.error("Failed to load questions");
          return;
        }
      } else {
        console.log("Questions already loading, waiting...");
        // Wait until loading is complete (or timeout)
        for (let i = 0; i < 20; i++) {
          if (!quizState.questionsLoading) break;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!quizState.questions || quizState.questions.length === 0) {
          console.error("Questions failed to load after waiting");
          return;
        }
      }
      
      // Create knowledge map after questions load
      updateKnowledgeMapForSubject();
      
      // Initialize the IRT model
      initializeIRTModel();
      
      // Display first question
      const firstQuestion = selectNextQuestion();
      if (firstQuestion) {
        displayQuestion(firstQuestion);
          } else {
        console.error("No questions available for quiz");
        quizStage.innerHTML = `
          <div class="error-message">
            <h2>No questions available</h2>
            <p>Unable to find questions for this subject.</p>
            <button class="cta-button primary" onclick="window.location.href='index.html'">Return to Home</button>
          </div>
        `;
        return;
      }
      
      // Initialize quiz UI animations with a delay to improve initial load performance
      setTimeout(() => {
        initQuizAnimations();
      }, 500);
      
      // Start the timer
      startTimer();
      
      // Initialize charts
      ensureChartJsLoaded().then(() => {
        initializeResultsCharts();
        
        // Explicitly initialize the performance chart
        setTimeout(() => {
          const performanceCtx = document.getElementById("performanceChart");
          if (performanceCtx && window.Chart && !window.performanceChart) {
            try {
              window.performanceChart = new Chart(performanceCtx.getContext("2d"), {
                type: "line",
                data: {
                  labels: ["Q0"],
                  datasets: [{
                    label: "Ability Estimate",
                    data: [0],
                    borderColor: "#6E44FF",
                    backgroundColor: "rgba(110, 68, 255, 0.1)",
                    tension: 0.4,
                    fill: true,
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 1,
                      ticks: {
                        color: "rgba(255, 255, 255, 0.7)"
                      },
                      grid: {
                        color: "rgba(255, 255, 255, 0.05)"
                      }
                    },
                    x: {
                      ticks: {
                        color: "rgba(255, 255, 255, 0.7)"
                      },
                      grid: {
                        color: "rgba(255, 255, 255, 0.05)"
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }
              });
              console.log("Performance chart explicitly initialized during startup");
            } catch (e) {
              console.error("Failed to initialize performance chart:", e);
            }
          }
        }, 1000);
      }).catch(error => {
        console.warn("Charts initialization failed:", error);
      });
      
      // Set up global event listeners if not already set
      if (!quizState.eventListenersInitialized) {
      setupGlobalEventListeners();
        quizState.eventListenersInitialized = true;
      }
      
      console.log("Quiz initialization complete");
      
    } catch (error) {
      console.error("Error initializing quiz:", error);
      
      // Display error message
      const quizStage = document.querySelector(".quiz-stage");
      if (quizStage) {
        quizStage.innerHTML = `
          <div class="error-message">
            <h2>Failed to initialize quiz</h2>
            <p>${error.message || "An unknown error occurred"}</p>
            <button class="cta-button primary" onclick="window.location.href='index.html'">Return to Home</button>
            </div>
        `;
      }
    }
  }
  
  // Set up event listeners for global elements
  function setupGlobalEventListeners() {
    // Exit button event listener
    const exitButton = document.querySelector(".exit-button")
    if (exitButton) {
      // Remove any existing event listeners
      const newExitButton = exitButton.cloneNode(true)
      exitButton.parentNode.replaceChild(newExitButton, exitButton)
      
      newExitButton.addEventListener("click", () => {
        // Show confirmation popup
        const confirmation = confirm("Are you sure you want to exit the quiz? Your progress will be lost.")
        if (confirmation) {
          window.location.href = "index.html"
        }
      })
    }
  
    // Close results button event listener
    const closeResults = document.querySelector(".close-results")
    const resultsOverlay = document.querySelector(".results-overlay")
    if (closeResults && resultsOverlay) {
      // Remove any existing event listeners
      const newCloseResults = closeResults.cloneNode(true)
      closeResults.parentNode.replaceChild(newCloseResults, closeResults)
      
      newCloseResults.addEventListener("click", () => {
        resultsOverlay.classList.add("hidden")
      })
    }
  
    // Retry button event listener
    const retryButton = document.querySelector(".action-button.retry")
    if (retryButton && resultsOverlay) {
      // Remove any existing event listeners
      const newRetryButton = retryButton.cloneNode(true)
      retryButton.parentNode.replaceChild(newRetryButton, retryButton)
      
      newRetryButton.addEventListener("click", () => {
        // Hide the results overlay first
        resultsOverlay.classList.add("hidden")
        
        // Remove any confetti or notifications
        const confettiContainer = document.querySelector(".confetti-container")
        if (confettiContainer) {
          confettiContainer.remove()
        }
        
        // Hide any achievement notifications
        const achievementNotification = document.querySelector(".achievement-notification")
        if (achievementNotification) {
          achievementNotification.classList.remove("visible")
        }
        
        // Reset quiz container classes
        const quizContainer = document.querySelector(".quiz-container")
        if (quizContainer) {
          quizContainer.classList.add("question-active")
        }
        
        // Reset the quiz state completely
        quizState.currentQuestion = 1
        quizState.abilityEstimate = 0.5
        quizState.selectedAnswer = null
        quizState.answeredQuestions = []
        quizState.abilityHistory = [0]
        
        // Clear topic masteries for a fresh start
        Object.keys(quizState.topicMasteries).forEach(topic => {
          quizState.topicMasteries[topic] = 0.25
        })
        
        // Reset the timer
        clearInterval(quizState.timerInterval)
        quizState.timer = 0
        quizState.totalTime = 0
        quizState.quizStartTime = Date.now()
        quizState.lastTimerUpdate = Date.now()
        
        // Update UI elements
        const questionNumber = document.querySelector(".question-number")
        if (questionNumber) {
          questionNumber.textContent = "1"
        }
        
                  // Reset performance chart
          if (window.performanceChart) {
            window.performanceChart.data.labels = ["Q0"]
            window.performanceChart.data.datasets[0].data = [0]
            window.performanceChart.update('none')
          }
          
          // Update ability display
          updateAbilityDisplay()
        
        // Start timer
        startTimer()
        
                  // Update knowledge map with fresh data
          updateKnowledgeMapForSubject()
          
          // Get a new first question and display it
          const firstQuestion = selectNextQuestion()
          if (firstQuestion) {
            // Clear the quiz stage
            const quizStage = document.querySelector(".quiz-stage")
            if (quizStage) {
              quizStage.innerHTML = ''
            }
            
            // Display the first question
            displayQuestion(firstQuestion)
            
            // Make sure question card is properly visible
            setTimeout(ensureQuestionCardVisibility, 100)
            
            console.log("Started a new quiz")
          }
        
        // Force refresh all UI elements
        setTimeout(forceUIRefresh, 100)
      })
    }
  
    // Home button event listener
    const homeButton = document.querySelector(".action-button.home")
    if (homeButton) {
      // Remove any existing event listeners
      const newHomeButton = homeButton.cloneNode(true)
      homeButton.parentNode.replaceChild(newHomeButton, homeButton)
      
      newHomeButton.addEventListener("click", () => {
        window.location.href = "index.html"
      })
    }
  
    // Share button event listener
    const shareButton = document.querySelector(".action-button.share")
    if (shareButton) {
      // Remove any existing event listeners
      const newShareButton = shareButton.cloneNode(true)
      shareButton.parentNode.replaceChild(newShareButton, shareButton)
      
      newShareButton.addEventListener("click", () => {
        // Simulate share functionality
        alert("Share functionality would be implemented here!")
      })
    }
  }

  // Update the knowledge map based on the selected subject
  function updateKnowledgeMapForSubject() {
    const knowledgeMap = document.querySelector(".knowledge-map")
    if (!knowledgeMap) {
      console.warn("Knowledge map element not found")
      return
    }
    
    
    // Clear existing nodes
    knowledgeMap.innerHTML = ""
    
    // Create SVG for connections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.classList.add("map-connections")
    knowledgeMap.appendChild(svg)
    
    // Add new nodes based on subject
    const topicStructure = quizState.subjectTopics
    if (!topicStructure || Object.keys(topicStructure).length === 0) {
      console.warn("No topic structure found for knowledge map")
      return
    }
    
    const topics = Object.keys(topicStructure)
    
    // Generate positions for nodes
    const positions = [
      { top: "20%", left: "30%" },
      { top: "40%", left: "70%" },
      { top: "70%", left: "20%" },
      { top: "60%", left: "50%" },
      { top: "30%", left: "60%" },
      { top: "50%", left: "35%" }
    ]
    
    // Create nodes
    topics.forEach((topic, index) => {
      const position = positions[index % positions.length]
      const topicInfo = topicStructure[topic]
      
      if (!topicInfo) {
        console.warn(`No topic info found for topic: ${topic}`)
        return
      }
      
      const node = document.createElement("div")
      node.classList.add("map-node")
      node.setAttribute("data-topic", topic)
      node.style.top = position.top
      node.style.left = position.left
      
      const nodeFill = document.createElement("div")
      nodeFill.classList.add("node-fill")
      
      const nodeLabel = document.createElement("span")
      nodeLabel.classList.add("node-label")
      nodeLabel.textContent = topicInfo.name
      
      node.appendChild(nodeFill)
      node.appendChild(nodeLabel)
      knowledgeMap.appendChild(node)
    })
    
    // Add subject-specific CSS class to nodes based on subject
    const mapNodes = document.querySelectorAll(".map-node .node-fill")
    if (mapNodes && mapNodes.length > 0) {
      const subjectClass = `${quizState.selectedSubject}-node`
      mapNodes.forEach(node => {
        // Remove existing subject classes
        node.classList.remove("mathematics-node", "computer-science-node", "science-node")
        // Add current subject class
        node.classList.add(subjectClass)
      })
    }
    
    // Create connections between nodes with safety checks
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i]
      const topicInfo = topicStructure[topic]
      
      if (!topicInfo) continue
      
      // Create connections to prerequisites
      if (topicInfo.prerequisites && topicInfo.prerequisites.length > 0) {
        topicInfo.prerequisites.forEach(prereq => {
          if (topics.includes(prereq)) {
            const sourceNode = document.querySelector(`.map-node[data-topic="${prereq}"]`)
            const targetNode = document.querySelector(`.map-node[data-topic="${topic}"]`)
            
            if (sourceNode && targetNode) {
              try {
                // Get positions
                const sourcePos = getNodeCenter(sourceNode)
                const targetPos = getNodeCenter(targetNode)
                
                // Create the line
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
                line.classList.add("map-connection")
                line.setAttribute("data-connection", `${prereq}-${topic}`)
                line.setAttribute("x1", sourcePos.x)
                line.setAttribute("y1", sourcePos.y)
                line.setAttribute("x2", targetPos.x)
                line.setAttribute("y2", targetPos.y)
                
                svg.appendChild(line)
              } catch (error) {
                console.warn("Error creating knowledge map connection:", error)
              }
            }
          }
        })
      }
    }
  }
  
  // Safe GSAP animation function with error handling
  function animateWithGSAP(target, fromProps, toProps) {
    if (!window.gsap) {
      console.warn("GSAP not available for animations")
      return
    }
    
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target
    
    if (!targetElement) {
      console.warn(`GSAP target not found: ${target}`)
      return
    }
    
    try {
      gsap.fromTo(targetElement, fromProps, toProps)
    } catch (error) {
      console.error("GSAP animation error:", error)
    }
  }
  
  // Helper to get center position of a node
  function getNodeCenter(node) {
    if (!node || !node.parentElement) {
      return { x: "50%", y: "50%" }
    }
    
    try {
      const rect = node.getBoundingClientRect()
      const parentRect = node.parentElement.getBoundingClientRect()
      
      // Return position as percentages
      return {
        x: ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width * 100) + "%",
        y: ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height * 100) + "%"
      }
    } catch (error) {
      console.warn("Error calculating node center:", error)
      return { x: "50%", y: "50%" }
    }
  }

  // Modify ensureQuestionCardVisibility function to add background overlay
  function ensureQuestionCardVisibility() {
    const questionCard = document.querySelector(".question-card");
    if (questionCard) {
      // Ensure the card is visible
      questionCard.style.display = "block";
      questionCard.style.opacity = "1";
      
      // Apply stronger styling through a class
      questionCard.classList.add("focused-card");
      
      // Make the quiz container aware a question is active
      const quizContainer = document.querySelector('.quiz-container');
      if (quizContainer) {
        quizContainer.classList.add('question-active');
        
        // Create or update backdrop overlay to enhance contrast
        let backdrop = document.querySelector('.question-backdrop');
        if (!backdrop) {
          backdrop = document.createElement('div');
          backdrop.className = 'question-backdrop';
          quizContainer.insertBefore(backdrop, quizContainer.firstChild);
        }
      }
      
      // Reduce knowledge map visibility explicitly
      const knowledgeMap = document.querySelector('.knowledge-map');
      if (knowledgeMap) {
        knowledgeMap.style.opacity = "0.03";
      }
      
      console.log("Question card visibility ensured");
    } else {
      console.warn("Question card not found to ensure visibility");
    }
  }

  // Function to initialize charts specifically for the results page
  function initializeResultsCharts() {
    console.log("Initializing results charts");
    
    // Initialize radar chart if needed
    const radarCtx = document.getElementById("knowledgeRadar");
    if (radarCtx && window.Chart) {
      try {
        // Get topic names based on subject or use current masteries
        let topicNames = [];
        let masteryValues = [];
        
        if (Object.keys(quizState.topicMasteries).length > 0) {
          // Use actual topic data
          const topics = Object.keys(quizState.topicMasteries);
          topicNames = topics.map(topic => 
            quizState.subjectTopics[topic] ? quizState.subjectTopics[topic].name : topic
          );
          masteryValues = topics.map(topic => quizState.topicMasteries[topic]);
        } else {
          // Fallback to default labels
          topicNames = quizState.selectedSubject === "mathematics" 
            ? ["Algebra", "Geometry", "Calculus", "Statistics", "Probability"]
            : quizState.selectedSubject === "computer-science"
              ? ["Programming", "Algorithms", "Data Structures", "Computer Systems", "Theory"]
              : ["Physics", "Chemistry", "Biology", "Earth Science", "Astronomy"];
          masteryValues = topicNames.map(() => 0.25); // Default 25% mastery
        }
        
        console.log("Creating radar chart with:", { topicNames, masteryValues });
        
        // Destroy existing chart if it exists
        if (window.radarChart) {
          window.radarChart.destroy();
        }
        
        // Create new chart with improved configuration
        window.radarChart = new Chart(radarCtx, {
          type: "radar",
          data: {
            labels: topicNames,
            datasets: [
              {
                label: "Topic Mastery",
                data: masteryValues,
                backgroundColor: "rgba(110, 68, 255, 0.25)",
                borderColor: "#6E44FF",
                borderWidth: 2,
                pointBackgroundColor: topicNames.map((_, i) => {
                  const hue = (270 + i * 30) % 360;
                  return `hsl(${hue}, 70%, 60%)`;
                }),
                pointBorderColor: "#fff",
                pointHoverBackgroundColor: "#fff",
                pointHoverBorderColor: "#FF44E3",
                pointRadius: 5,
                pointHoverRadius: 7,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `Mastery: ${Math.round(context.raw * 100)}%`;
                  }
                },
                backgroundColor: 'rgba(35, 10, 60, 0.95)',
                titleFont: {
                  size: 14,
                  weight: 'bold'
                },
                bodyFont: {
                  size: 13
                },
                borderColor: 'rgba(110, 68, 255, 0.5)',
                borderWidth: 1,
                padding: 10,
                displayColors: true,
                boxPadding: 5
              }
            },
            scales: {
              r: {
                angleLines: {
                  color: "rgba(255, 255, 255, 0.1)",
                  lineWidth: 1
                },
                grid: {
                  color: "rgba(255, 255, 255, 0.1)",
                  circular: true
                },
                pointLabels: {
                  color: "rgba(255, 255, 255, 0.8)",
                  font: {
                    size: 14,
                    weight: '500'
                  },
                  padding: 10
                },
                ticks: {
                  backdropColor: "transparent",
                  color: "rgba(255, 255, 255, 0.5)",
                  stepSize: 0.2,
                  callback: function(value) {
                    return Math.round(value * 100) + '%';
                  },
                  font: {
                    size: 11
                  },
                  z: 1
                },
                min: 0,
                max: 1,
                beginAtZero: true
              },
            },
            elements: {
              line: {
                tension: 0.2
              }
            },
            animation: {
              duration: 2000,
              easing: 'easeOutQuart'
            }
          },
        });
        
        console.log("Radar chart created successfully");
        
        // Force chart to be visible by adding explicit sizing
        const radarContainer = radarCtx.parentElement;
        if (radarContainer) {
          radarContainer.style.height = '300px';
          radarContainer.style.width = '100%';
          setTimeout(() => {
            if (window.radarChart) {
              window.radarChart.resize();
              window.radarChart.update();
            }
          }, 100);
        }
        
      } catch (error) {
        console.error("Error initializing radar chart for results:", error);
      }
    } else {
      console.warn("Radar chart context or Chart.js not available");
    }
    
    // Initialize performance chart if needed
      const performanceCtx = document.getElementById("performanceChart");
      if (performanceCtx && window.Chart) {
        try {
          // Generate labels and data based on current question
          const labels = [];
          const data = [];
          
          // If we have answered questions, show actual progress
          if (quizState.currentQuestion > 1) {
            for (let i = 1; i <= quizState.currentQuestion; i++) {
              labels.push(`Q${i}`);
              data.push(quizState.abilityEstimate);
            }
          } else {
            // Default initial state
            labels.push("Q1");
            data.push(0);
          }
          
        // Destroy existing chart if it exists
        if (window.performanceChart) {
          window.performanceChart.destroy();
        }
        
        // Create new chart
        window.performanceChart = new Chart(performanceCtx, {
            type: "line",
            data: {
              labels: labels,
              datasets: [
                {
                  label: "Ability Estimate",
                  data: data,
                  borderColor: "#6E44FF",
                  backgroundColor: "rgba(110, 68, 255, 0.1)",
                  tension: 0.4,
                  fill: true,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `Ability: ${Math.round(context.raw * 100)}%`;
                  }
                }
              }
            },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 1,
                  grid: {
                    color: "rgba(255, 255, 255, 0.05)",
                  },
                  ticks: {
                    color: "rgba(255, 255, 255, 0.7)",
                  callback: function(value) {
                    return Math.round(value * 100) + '%';
                  }
                  },
                },
                x: {
                  grid: {
                    color: "rgba(255, 255, 255, 0.05)",
                  },
                  ticks: {
                    color: "rgba(255, 255, 255, 0.7)",
                  },
                },
              },
            },
          });
        
        console.log("Performance chart created successfully");
        } catch (error) {
          console.error("Error initializing performance chart:", error);
        }
    } else {
      console.warn("Performance chart context or Chart.js not available");
    }
  }

  // Ensure Chart.js is loaded with retry mechanism
  function ensureChartJsLoaded() {
    return new Promise((resolve, reject) => {
      // Check if Chart.js is already available and working
      if (window.Chart && typeof window.Chart === 'function' && !window.Chart.fallback) {
        console.log("Chart.js already loaded and verified");
        resolve(true);
        return;
      }
      
      // Add timeout safety
      const timeout = setTimeout(() => {
        console.warn("Chart.js loading timeout");
        resolve(false);
      }, 5000);
      
      // Create a function to test if Chart.js is working
      const testChart = () => {
        try {
          // Create a small test canvas to verify Chart.js works
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 10;
          testCanvas.height = 10;
          testCanvas.style.display = 'none';
          document.body.appendChild(testCanvas);
          
          // Try to create a minimal chart
          const testInstance = new window.Chart(testCanvas, {
            type: 'line',
            data: {labels: [1], datasets: [{data: [1]}]},
            options: {responsive: false}
          });
          
          // Clean up
          testInstance.destroy();
          document.body.removeChild(testCanvas);
          return true;
        } catch (e) {
          console.warn("Chart.js test failed:", e);
          return false;
        }
      };
      
      // Function to load script with promise
      const loadScript = (src) => {
        return new Promise((resolveScript, rejectScript) => {
      const script = document.createElement('script');
          script.src = src;
          script.async = true;
          
          // Set timeout for individual script load
          const scriptTimeout = setTimeout(() => {
            console.warn(`Script load timeout: ${src}`);
            rejectScript(new Error(`Timeout loading script from ${src}`));
          }, 3000);
          
      script.onload = () => {
            console.log(`Successfully loaded Chart.js from ${src}`);
            clearTimeout(scriptTimeout);
            
            // Test if Chart.js actually works
            if (testChart()) {
              resolveScript(true);
            } else {
              // Script loaded but Chart.js isn't working
              rejectScript(new Error(`Chart.js loaded from ${src} but not functioning`));
            }
          };
          
      script.onerror = () => {
            console.warn(`Failed to load Chart.js from ${src}`);
            clearTimeout(scriptTimeout);
            rejectScript(new Error(`Failed to load Chart.js from ${src}`));
      };
          
      document.head.appendChild(script);
    });
      };
      
      // Try multiple CDNs with fallbacks
      loadScript('https://cdn.jsdelivr.net/npm/chart.js')
        .catch(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'))
        .catch(() => loadScript('https://unpkg.com/chart.js@3.9.1/dist/chart.min.js'))
        .then(() => {
          // Success - verify again to be sure
          clearTimeout(timeout);
          
          if (window.Chart && typeof window.Chart === 'function' && testChart()) {
            console.log("Chart.js successfully loaded and verified");
            
            // Initialize any charts that need it
            initializeResultsCharts();
            resolve(true);
          } else {
            console.error("Chart.js failed to initialize properly");
            reject(new Error("Chart.js failed to initialize properly"));
          }
        })
        .catch((error) => {
          console.error("All Chart.js CDN attempts failed", error);
          clearTimeout(timeout);
          
          // Create enhanced fallback with minimal visualization
          window.Chart = function(ctx, config) {
            console.warn("Using enhanced Chart.js fallback");
            const canvas = ctx.canvas || ctx;
            if (canvas && canvas.getContext) {
              const context = canvas.getContext('2d');
              context.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw a better fallback visualization
              const width = canvas.width;
              const height = canvas.height;
              
              // Draw background
              context.fillStyle = 'rgba(35, 10, 60, 0.3)';
              context.fillRect(0, 0, width, height);
              
              // Draw grid lines
              context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
              context.lineWidth = 1;
              
              // Horizontal lines
              for (let i = 1; i < 5; i++) {
                context.beginPath();
                context.moveTo(0, height * i / 5);
                context.lineTo(width, height * i / 5);
                context.stroke();
              }
              
              // Vertical lines
              for (let i = 1; i < 5; i++) {
                context.beginPath();
                context.moveTo(width * i / 5, 0);
                context.lineTo(width * i / 5, height);
                context.stroke();
              }
              
              // Draw placeholder message
              context.font = '14px Arial';
              context.fillStyle = 'white';
              context.textAlign = 'center';
              context.fillText('Chart visualization unavailable', width/2, height/2);
              context.font = '12px Arial';
              context.fillText('Please reload the page to try again', width/2, height/2 + 20);
            }
            
            // Return a mock chart object with required methods
            return {
              update: function() { 
                console.log("Fallback chart update called");
              },
              destroy: function() {
                console.log("Fallback chart destroy called");
                if (canvas && canvas.getContext) {
                  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                }
              },
              resize: function() {
                console.log("Fallback chart resize called");
              },
              data: config.data || { datasets: [] },
              options: config.options || {},
              ctx: ctx
            };
          };
          
          // Add required properties to make it look like Chart.js
          window.Chart.fallback = true;
          window.Chart.register = function() {};
          window.Chart.defaults = { global: {} };
          
          resolve(false);
        });
    });
  }

  // Initialize the quiz when the page loads
  if (document.querySelector(".quiz-body")) {
    // Show loading indicator
    const quizStage = document.querySelector(".quiz-stage")
    if (quizStage) {
      quizStage.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading ${quizState.selectedSubject.replace("-", " ")} questions...</p>
        </div>
      `
    }
    
    // Define a function to ensure the DOM is fully loaded
    function whenDocumentReady(callback) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback)
      } else {
        callback()
      }
    }
    
    // Initialize quiz with safety precautions
    whenDocumentReady(() => {
      // First try to initialize the performance chart directly
      try {
        console.log("Direct initialization of performance chart");
        const performanceCtx = document.getElementById("performanceChart");
        if (performanceCtx && typeof Chart !== 'undefined' && !window.performanceChart) {
          window.performanceChart = new Chart(performanceCtx.getContext("2d"), {
            type: "line",
            data: {
              labels: ["Start"],
              datasets: [{
                label: "Ability Estimate",
                data: [0],
                borderColor: "#6E44FF",
                backgroundColor: "rgba(110, 68, 255, 0.1)",
                tension: 0.4,
                fill: true,
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 1,
                  grid: {
                    color: "rgba(255, 255, 255, 0.05)",
                  },
                  ticks: {
                    color: "rgba(255, 255, 255, 0.7)",
                  },
                },
                x: {
                  grid: {
                    color: "rgba(255, 255, 255, 0.05)",
                  },
                  ticks: {
                    color: "rgba(255, 255, 255, 0.7)",
                  },
                },
              },
              plugins: {
                legend: {
                  display: false,
                },
              },
            },
          });
          console.log("Performance chart initialized in whenDocumentReady");
          
          // Force a resize after a delay
          setTimeout(() => {
            if (window.performanceChart) {
              window.performanceChart.resize();
              console.log("Forced chart resize");
            }
          }, 200);
        }
      } catch (chartError) {
        console.error("Error initializing performance chart:", chartError);
      }
      
      // Initial delay to ensure everything is loaded
      setTimeout(async () => {
        try {
          // Check if both script tags are present
          const jsFiles = Array.from(document.querySelectorAll('script')).map(s => s.src)
          const requiredFiles = ['quiz.js', 'quiz-animations.js']
          
          const missingFiles = requiredFiles.filter(file => 
            !jsFiles.some(src => src.includes(file))
          )
          
          if (missingFiles.length > 0) {
            console.warn(`Missing script files: ${missingFiles.join(', ')}. Attempting to load...`)
            
            // Try to load missing files
            for (const file of missingFiles) {
              const script = document.createElement('script')
              script.src = file
              document.head.appendChild(script)
            }
            
            // Give time for scripts to load
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
          // Initialize quiz and handle animation libraries
          const quizInitialized = await initQuiz()
          
          // Initialize animations only if GSAP is available and quiz initialized
          if (quizInitialized && window.gsap && typeof window.gsap !== 'undefined' && window.gsap !== window.fallbackGSAP) {
            try {
              initQuizAnimations()
            } catch (animError) {
              console.warn("Failed to initialize animations:", animError)
            }
          }
        } catch (error) {
          console.error("Error during quiz startup:", error)
          const quizStage = document.querySelector(".quiz-stage")
          if (quizStage) {
            quizStage.innerHTML = `
              <div class="error-message">
                <h2>Failed to start quiz</h2>
                <p>${error.message}</p>
                <button class="cta-button primary" onclick="window.location.href='index.html'">Return to Home</button>
              </div>
            `
          }
        }
      }, 500)
    })
  }

  // Bayesian Knowledge Tracing update
  function updateTopicMastery(topic, correct) {
    const mastery = quizState.topicMasteries[topic] || 0.25;
    
    // BKT parameters
    const pLearn = 0.1; // Probability of learning if not already mastered
    const pGuess = 0.25; // Probability of guessing correctly if not mastered
    const pSlip = 0.1; // Probability of answering incorrectly if mastered
    
    let updatedMastery;
    
    if (correct) {
      // P(mastered | correct) = P(correct | mastered) * P(mastered) / P(correct)
      const pCorrectGivenMastered = 1 - pSlip;
      const pCorrectGivenNotMastered = pGuess;
      const pCorrect = pCorrectGivenMastered * mastery + pCorrectGivenNotMastered * (1 - mastery);
      
      updatedMastery = (pCorrectGivenMastered * mastery) / pCorrect;
    } else {
      // P(mastered | incorrect) = P(incorrect | mastered) * P(mastered) / P(incorrect)
      const pIncorrectGivenMastered = pSlip;
      const pIncorrectGivenNotMastered = 1 - pGuess;
      const pIncorrect = pIncorrectGivenMastered * mastery + pIncorrectGivenNotMastered * (1 - mastery);
      
      updatedMastery = (pIncorrectGivenMastered * mastery) / pIncorrect;
    }
    
    // Apply learning
    updatedMastery = updatedMastery + (1 - updatedMastery) * pLearn;
    
    // Update topic mastery
    quizState.topicMasteries[topic] = updatedMastery;
    
    // Update topic weight (inverse of mastery)
    quizState.topicWeights[topic] = 1 + (1 - updatedMastery);
    
    return updatedMastery;
  }
  
  // Update ability estimate based on response using IRT
  function updateAbilityEstimate(correct, difficulty, discrimination) {
    // Store old value for reference
    const oldAbility = quizState.abilityEstimate;
    
    // Use proper Item Response Theory formula based on 3-parameter logistic model
    // θ is the ability parameter (theta)
    // b is the difficulty parameter
    // a is the discrimination parameter
    // The update formula is based on Expected a Posteriori (EAP) estimation
    
    // Calculate the probability of correct answer given current ability
    const theta = oldAbility;
    const a = discrimination;
    const b = difficulty;
    
    // Calculate the probability of correct response using logistic function
    const z = a * (theta - b);
    const p = 1 / (1 + Math.exp(-1.7 * z)); // 1.7 is used to approximate normal ogive
    
    // Calculate information value of the item at current ability
    const information = a * a * p * (1 - p);
    
    // Calculate ability update (more informative items have larger updates)
    const updateDirection = correct ? 1 : -1;
    const updateMagnitude = Math.sqrt(information) * 0.2; // Scale factor
    
    // Apply update based on Bayesian estimation principle
    let update = updateDirection * updateMagnitude;
    
    // Apply adaptive scaling to make updates more significant
    // Smaller updates near extremes (0 or 1), larger updates in mid-range
    const adaptiveScale = 4 * theta * (1 - theta); // Parabolic scaling
    update *= (0.5 + adaptiveScale);
    
    // Apply the update to the ability estimate
    let newAbility = oldAbility + update;
    
    // Ensure ability stays within bounds
    newAbility = Math.max(0.05, Math.min(0.95, newAbility));
    quizState.abilityEstimate = newAbility;
    
    console.log(`Ability update: ${oldAbility.toFixed(3)} → ${newAbility.toFixed(3)} (${update >= 0 ? '+' : ''}${update.toFixed(3)})`);
    console.log(`Update details: correct=${correct}, difficulty=${difficulty.toFixed(2)}, discrimination=${discrimination.toFixed(2)}, p=${p.toFixed(3)}, info=${information.toFixed(3)}`);
    
    // DIRECT DOM UPDATES for immediate visual feedback
    // Update ability value text
    const abilityValue = document.querySelector(".ability-value");
    if (abilityValue) {
      abilityValue.textContent = quizState.abilityEstimate.toFixed(1);
      
      // Apply highlight animation to make change more noticeable
      abilityValue.style.transition = "all 0.3s";
      abilityValue.style.transform = "scale(1.2)";
      abilityValue.style.color = correct ? "#4CAF50" : "#F44336";
      
      // Reset after animation
      setTimeout(() => {
        abilityValue.style.transform = "scale(1)";
        abilityValue.style.color = "";
      }, 500);
    }
    
    // Update ability fill bar
    const abilityFill = document.querySelector(".ability-fill");
    if (abilityFill) {
      const fillWidth = `${quizState.abilityEstimate * 100}%`;
      abilityFill.style.transition = "width 0.5s ease-out";
      abilityFill.style.width = fillWidth;
    }
    
    // Standard update via function
    updateAbilityDisplay();
    
    // Return the old and new values for reference
    return { oldAbility, newAbility: quizState.abilityEstimate };
  }

  // Add this new global function to force UI refresh
  function forceUIRefresh() {
    console.log("Forcing UI refresh with current state values");
    
    // Update ability indicator in header
    updateAbilityDisplay();
    
    // Update sidebar for current question
    if (quizState.currentQuestionData) {
      updateSidebarForQuestion(quizState.currentQuestionData);
    }
    
    // Update performance chart if available
    if (window.performanceChart) {
      try {
        window.performanceChart.update('none');
      } catch (e) {
        console.warn("Could not update performance chart:", e);
      }
    }
  }

  // Enhance the radar chart with better styling and legend
  function enhanceRadarChart() {
    const radarContainer = document.querySelector(".knowledge-radar");
    if (!radarContainer) return;
    
    // Check if enhancement is already done
    if (radarContainer.querySelector(".radar-legend")) return;
    
    // First add the interactive knowledge map visualization
    addInteractiveKnowledgeMap(radarContainer);
    
    // Get the chart data
    const chart = window.radarChart;
    if (!chart || !chart.data || !chart.data.datasets || !chart.data.datasets[0]) return;
    
    // Add radar chart legend
    const radarLegend = document.createElement("div");
    radarLegend.className = "radar-legend";
    
    // Add legend items based on chart labels
    const labels = chart.data.labels || [];
    const data = chart.data.datasets[0].data || [];
    
    labels.forEach((label, index) => {
      const legendItem = document.createElement("div");
      legendItem.className = "radar-legend-item";
      
      // Calculate hue based on index for unique colors
      const hue = (270 + index * 30) % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      legendItem.innerHTML = `
        <div class="radar-legend-color" style="background: ${color}"></div>
        <div class="radar-legend-label">${label}: ${Math.round(data[index] * 100)}%</div>
      `;
      
      radarLegend.appendChild(legendItem);
      
      // Update chart colors
      if (chart.data.datasets[0].pointBackgroundColor) {
        chart.data.datasets[0].pointBackgroundColor[index] = color;
      }
    });
    
    // Append legend to radar container
    radarContainer.appendChild(radarLegend);
    
    // Update chart with improved styling
    if (chart) {
      chart.options.plugins.legend.display = false;
      chart.options.elements = {
        line: {
          tension: 0.4,
          borderWidth: 3
        },
        point: {
          radius: 5,
          borderWidth: 2,
          hoverRadius: 7,
          hoverBorderWidth: 2
        }
      };
      
      // Update chart
      chart.update();
    }
  }
  
  // Add interactive knowledge map to results visualization
  function addInteractiveKnowledgeMap(container) {
    if (!container) return;
  
    // Check if the map already exists
    if (container.querySelector('.results-knowledge-map')) return;
    
    // Create knowledge map container
    const knowledgeMapContainer = document.createElement('div');
    knowledgeMapContainer.className = 'results-knowledge-map';
    
    // Create SVG for connections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("map-connections");
    knowledgeMapContainer.appendChild(svg);
    
    // Get data from radarChart or quizState
    const chart = window.radarChart;
    if (!chart || !chart.data || !chart.data.labels) return;
    
    const topicNames = chart.data.labels;
    const masteryValues = chart.data.datasets[0].data;
    
    // Generate positions for nodes (in a circle for better visualization)
    const nodePositions = [];
    const nodeCount = topicNames.length;
    const radius = 35; // % of container
    const centerX = 50; // center position
    const centerY = 50;
    
    // Create debug message for console to verify node positioning
    let posDebug = {centerX, centerY, radius, topicCount: nodeCount, positions: []};
    
    for (let i = 0; i < nodeCount; i++) {
      // Calculate position in a circle
      const angle = (i / nodeCount) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions.push({ x: `${x}%`, y: `${y}%` });
      posDebug.positions.push({index: i, topic: topicNames[i], x: `${x}%`, y: `${y}%`});
    }
    console.log("Knowledge map node positions:", posDebug);
    
    // Create center node for subject
    const centerNode = document.createElement('div');
    centerNode.className = 'map-node center-node';
    centerNode.style.top = `${centerY}%`;
    centerNode.style.left = `${centerX}%`;
    
    // Get subject for center node
    let subjectName = "Subject";
    if (quizState.selectedSubject) {
      subjectName = quizState.selectedSubject.replace('-', ' ');
    }
    
    centerNode.innerHTML = `
      <div class="node-fill" style="background-color: #6E44FF;"></div>
      <span class="node-label subject-label">${subjectName}</span>
    `;
    
    knowledgeMapContainer.appendChild(centerNode);
    
    // Create nodes for each topic
    topicNames.forEach((topic, index) => {
      const mastery = masteryValues[index];
      const position = nodePositions[index];
      
      // Calculate color based on mastery level
      const hue = (270 + index * 30) % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      const node = document.createElement('div');
      node.className = 'map-node topic-node';
      node.setAttribute('data-topic', topic);
      node.style.top = position.y;
      node.style.left = position.x;
      
      // Apply mastery to visual properties
      const opacity = 0.3 + mastery * 0.7;
      const scale = 0.7 + mastery * 0.5; // Increased minimum scale for better visibility
      
      node.innerHTML = `
        <div class="node-fill" style="background-color: ${color}; transform: scale(${scale}); opacity: ${opacity};"></div>
        <span class="node-label">${topic}</span>
      `;
      
      // Add mastery percentage
      const masteryBadge = document.createElement('div');
      masteryBadge.className = 'mastery-badge';
      masteryBadge.textContent = `${Math.round(mastery * 100)}%`;
      masteryBadge.style.opacity = '1'; // Make badges always visible
      masteryBadge.style.transform = 'scale(1)';
      node.appendChild(masteryBadge);
      
      knowledgeMapContainer.appendChild(node);
      
      // Create connection from center to this node
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("map-connection");
      line.setAttribute("x1", "50%");
      line.setAttribute("y1", "50%");
      line.setAttribute("x2", position.x);
      line.setAttribute("y2", position.y);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-opacity", 0.7 + mastery * 0.3); // Increased minimum opacity
      line.setAttribute("stroke-width", 2 + Math.round(mastery * 3)); // Scale line width with mastery
      
      svg.appendChild(line);
    });
    
    // Add knowledge map before the canvas
    const canvas = container.querySelector('canvas');
    if (canvas) {
      container.insertBefore(knowledgeMapContainer, canvas);
    } else {
      container.appendChild(knowledgeMapContainer);
    }
    
    // Add hover interaction
    const topicNodes = knowledgeMapContainer.querySelectorAll('.topic-node');
    topicNodes.forEach(node => {
      node.addEventListener('mouseenter', () => {
        node.classList.add('highlight');
        // Highlight related connections
        const connections = svg.querySelectorAll(`.map-connection[x2="${node.style.left}"][y2="${node.style.top}"]`);
        connections.forEach(conn => conn.classList.add('highlight'));
      });
      
      node.addEventListener('mouseleave', () => {
        node.classList.remove('highlight');
        // Remove highlight from connections
        const connections = svg.querySelectorAll('.map-connection.highlight');
        connections.forEach(conn => conn.classList.remove('highlight'));
      });
    });
    
    // Log success message for debugging
    console.log(`Created knowledge map with ${topicNodes.length} topic nodes`);
    
    // Add animation with GSAP if available
    try {
      if (window.gsap && window.gsap !== window.fallbackGSAP) {
        // Animate nodes
        gsap.fromTo(
          knowledgeMapContainer.querySelectorAll('.node-fill'),
          { scale: 0, opacity: 0 },
          { 
            scale: (i, target) => 0.7 + parseFloat(target.style.transform.replace('scale(', '').replace(')', '')) * 0.5, 
            opacity: (i, target) => parseFloat(target.style.opacity), 
            duration: 1, 
            stagger: 0.1,
            ease: "elastic.out(1, 0.5)" 
          }
        );
        
        // Animate connections
        gsap.fromTo(
          knowledgeMapContainer.querySelectorAll('.map-connection'),
          { strokeDashoffset: 100, strokeDasharray: 100 },
          { strokeDashoffset: 0, duration: 1.5, stagger: 0.05 }
        );
      }
    } catch (error) {
      console.warn('Error animating knowledge map:', error);
    }
  }
  
  // Add circular progress indicators to each summary item
  function addCircularProgressToSummary() {
    // Get all summary items
    const summaryItems = document.querySelectorAll(".summary-item");
    if (!summaryItems || summaryItems.length === 0) return;
    
    // Process each summary item
    summaryItems.forEach((item, index) => {
      // Skip if already has circular progress
      if (item.querySelector(".circular-progress")) return;
      
      // Get value based on type
      let value = 0;
      let maxValue = 100;
      let color = "";
      
      // Different colors for different metrics
      switch(index) {
        case 0: // Ability score
          const abilityEl = item.querySelector(".summary-value");
          value = abilityEl ? parseFloat(abilityEl.textContent) * 10 : 0;
          maxValue = 100;
          color = "#6E44FF";
          break;
        case 1: // Questions answered
          const questionsEl = item.querySelector(".summary-value");
          value = questionsEl ? parseInt(questionsEl.textContent) : 0;
          maxValue = quizState.totalQuestions;
          color = "#48BEFF";
          break;
        case 2: // Accuracy
          const accuracyEl = item.querySelector(".summary-value");
          value = accuracyEl ? parseInt(accuracyEl.textContent) : 0;
          maxValue = 100;
          color = "#2ECC71";
          break;
        case 3: // Time - no circular progress for time
          return;
      }
      
      // Create circular progress container at beginning of item
      const circularContainer = document.createElement("div");
      circularContainer.className = "circular-progress";
      
      // Calculate circle properties
      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
      const dashOffset = circumference - (percentage / 100) * circumference;
      
      // Create SVG
      circularContainer.innerHTML = `
        <svg class="circular-progress-ring" width="120" height="120">
          <circle class="circular-progress-circle-bg" cx="60" cy="60" r="${radius}" />
          <circle class="circular-progress-circle" 
            cx="60" cy="60" r="${radius}"
            stroke="${color}"
            stroke-dasharray="${circumference} ${circumference}"
            stroke-dashoffset="${dashOffset}" />
        </svg>
        <div class="circular-progress-text">${Math.round(percentage)}%</div>
      `;
      
      // Insert at beginning of item
      if (item.firstChild) {
        item.insertBefore(circularContainer, item.firstChild);
      } else {
        item.appendChild(circularContainer);
      }
      
      // Animate the progress
      setTimeout(() => {
        const circle = circularContainer.querySelector(".circular-progress-circle");
        if (circle) {
          circle.style.strokeDashoffset = dashOffset;
        }
      }, 100);
    });
  }

  // Create a standalone knowledge map for results display
  function createStandaloneKnowledgeMap() {
    console.log("Creating standalone knowledge map");
    
    // Find the visualization section or create it if needed
    const resultsContainer = document.querySelector(".results-container");
    if (!resultsContainer) return;
    
    // Find the knowledge radar container
    let knowledgeRadar = document.querySelector('.knowledge-radar');
    if (!knowledgeRadar) {
      // If there's a visualization section, use that
      const visualizationSection = document.querySelector('.results-visualization');
      if (visualizationSection) {
        knowledgeRadar = visualizationSection.querySelector('.knowledge-radar');
        if (!knowledgeRadar) {
          // Create the radar container if it doesn't exist
          knowledgeRadar = document.createElement('div');
          knowledgeRadar.className = 'knowledge-radar';
          visualizationSection.appendChild(knowledgeRadar);
        }
      } else {
        console.error("Could not find knowledge radar or visualization section");
        return;
      }
    }
    
    // Remove any existing knowledge map
    const existingMap = knowledgeRadar.querySelector('.results-knowledge-map');
    if (existingMap) {
      knowledgeRadar.removeChild(existingMap);
    }

    // Create new knowledge map container
    const knowledgeMapContainer = document.createElement('div');
    knowledgeMapContainer.className = 'results-knowledge-map';
    
    // Create SVG for connections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("map-connections");
    knowledgeMapContainer.appendChild(svg);
    
    // Get topic data - use topicMasteries if available, otherwise create sample data
    let topicNames = [];
    let masteryValues = [];

    if (quizState.topicMasteries && Object.keys(quizState.topicMasteries).length > 0) {
      // Use real data from quizState
      console.log("Using real topic mastery data");
      const topics = Object.keys(quizState.topicMasteries);
      topicNames = topics.map(topic => 
        quizState.subjectTopics && quizState.subjectTopics[topic] 
          ? quizState.subjectTopics[topic].name 
          : topic
      );
      masteryValues = topics.map(topic => quizState.topicMasteries[topic]);
    } else {
      // Use fallback data based on subject
      console.log("Using fallback topic data");
      topicNames = quizState.selectedSubject === "mathematics" 
        ? ["Algebra", "Geometry", "Calculus", "Statistics", "Probability"]
        : quizState.selectedSubject === "computer-science"
          ? ["Programming", "Algorithms", "Data Structures", "Computer Systems", "Theory"]
          : ["Physics", "Chemistry", "Biology", "Earth Science", "Astronomy"];
      
      // Generate random masteries for demonstration
      masteryValues = topicNames.map(() => Math.random() * 0.8 + 0.2);
    }
    
    console.log("Knowledge map data:", { topicNames, masteryValues });
    
    // Generate positions for nodes (in a circle)
    const nodePositions = [];
    const nodeCount = topicNames.length;
    const radius = 35; // % of container
    const centerX = 50; // center position
    const centerY = 50;
    
    for (let i = 0; i < nodeCount; i++) {
      // Calculate position in a circle
      const angle = (i / nodeCount) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions.push({ x: `${x}%`, y: `${y}%` });
    }
    
    // Create center node for subject
    const centerNode = document.createElement('div');
    centerNode.className = 'map-node center-node';
    centerNode.style.top = `${centerY}%`;
    centerNode.style.left = `${centerX}%`;
    
    // Get subject for center node
    let subjectName = "Subject";
    if (quizState.selectedSubject) {
      subjectName = quizState.selectedSubject.replace('-', ' ');
    }
    
    centerNode.innerHTML = `
      <div class="node-fill" style="background-color: #6E44FF;"></div>
      <span class="node-label subject-label">${subjectName}</span>
    `;
    
    knowledgeMapContainer.appendChild(centerNode);
    
    // Create nodes for each topic
    topicNames.forEach((topic, index) => {
      const mastery = masteryValues[index];
      const position = nodePositions[index];
      
      // Calculate color based on index
      const hue = (270 + index * 30) % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      const node = document.createElement('div');
      node.className = 'map-node topic-node';
      node.setAttribute('data-topic', topic);
      node.style.top = position.y;
      node.style.left = position.x;
      
      // Apply mastery to visual properties
      const opacity = 0.5 + mastery * 0.5;
      const scale = 0.7 + mastery * 0.5;
      
      node.innerHTML = `
        <div class="node-fill" style="transform: scale(${scale}); opacity: ${opacity};"></div>
        <span class="node-label">${topic}</span>
      `;
      
      // Add mastery percentage
      const masteryBadge = document.createElement('div');
      masteryBadge.className = 'mastery-badge';
      masteryBadge.textContent = `${Math.round(mastery * 100)}%`;
      masteryBadge.style.opacity = '1';
      masteryBadge.style.transform = 'scale(1)';
      node.appendChild(masteryBadge);
      
      knowledgeMapContainer.appendChild(node);
      
      // Create connection from center to this node
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.classList.add("map-connection");
      line.setAttribute("x1", "50%");
      line.setAttribute("y1", "50%");
      line.setAttribute("x2", position.x);
      line.setAttribute("y2", position.y);
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-opacity", 0.7 + mastery * 0.3);
      line.setAttribute("stroke-width", 2 + Math.round(mastery * 3));
      
      svg.appendChild(line);
    });
    
    // Add the knowledge map to the container
    knowledgeRadar.prepend(knowledgeMapContainer);
    
    // Add hover interaction
    const topicNodes = knowledgeMapContainer.querySelectorAll('.topic-node');
    topicNodes.forEach(node => {
      node.addEventListener('mouseenter', () => {
        node.classList.add('highlight');
        // Highlight related connections
        const connections = svg.querySelectorAll(`.map-connection[x2="${node.style.left}"][y2="${node.style.top}"]`);
        connections.forEach(conn => conn.classList.add('highlight'));
      });
      
      node.addEventListener('mouseleave', () => {
        node.classList.remove('highlight');
        // Remove highlight from connections
        const connections = svg.querySelectorAll('.map-connection.highlight');
        connections.forEach(conn => conn.classList.remove('highlight'));
      });
    });
    
    console.log(`Created standalone knowledge map with ${topicNodes.length} topic nodes`);
  }

})
