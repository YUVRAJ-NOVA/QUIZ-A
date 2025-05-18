document.addEventListener("DOMContentLoaded", () => {
  // Check if GSAP is available and is not the fallback implementation
  if (typeof gsap === 'undefined' || gsap === window.fallbackGSAP) {
    console.warn("GSAP not available. Animations will be disabled.");
    
    // Apply basic styling for elements that would be animated
    try {
      // Make sure question card is visible
      const questionCard = document.querySelector(".question-card");
      if (questionCard) {
        questionCard.style.display = "block";
        questionCard.style.opacity = "1";
      }
      
      // Make sure answer options are visible
      const answerOptions = document.querySelectorAll(".answer-option");
      if (answerOptions) {
        answerOptions.forEach(option => {
          option.style.opacity = "1";
        });
      }
      
      // Make sure sidebar is visible
      const sidebar = document.querySelector(".quiz-sidebar");
      if (sidebar) {
        sidebar.style.opacity = "1";
      }
    } catch (error) {
      console.error("Error applying fallback styles:", error);
    }
    
    return; // Exit early
  }
  
  try {
    // Quiz page specific animations
    // Wrap all GSAP calls in try/catch blocks

    // Animate question card elements
    try {
      const difficultyIndicator = document.querySelector(".difficulty-indicator");
      if (difficultyIndicator) {
        gsap.from(".difficulty-indicator", {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: "power3.out",
          delay: 0.2,
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    try {
      const questionTopic = document.querySelector(".question-topic");
      if (questionTopic) {
        gsap.from(".question-topic", {
          opacity: 0,
          x: -20,
          duration: 0.8,
          ease: "power3.out",
          delay: 0.4,
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    try {
      const questionText = document.querySelector(".question-text");
      if (questionText) {
        gsap.from(".question-text", {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: "power3.out",
          delay: 0.6,
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    try {
      const questionVisual = document.querySelector(".question-visual");
      if (questionVisual) {
        gsap.from(".question-visual", {
          opacity: 0,
          scale: 0.9,
          duration: 0.8,
          ease: "power3.out",
          delay: 0.8,
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    try {
      const answerOptions = document.querySelectorAll(".answer-option");
      if (answerOptions && answerOptions.length > 0) {
        gsap.from(".answer-option", {
          opacity: 0,
          y: 20,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          delay: 1,
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    try {
      const questionActions = document.querySelector(".question-actions");
      if (questionActions) {
        gsap.from(".question-actions", {
          opacity: 0,
          y: 20,
          duration: 0.8,
          ease: "power3.out",
          delay: 1.4,
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    // Animate equation parts (if they exist)
    try {
      const equationParts = document.querySelectorAll(".equation-part");
      if (equationParts && equationParts.length > 0) {
        equationParts.forEach((part, index) => {
          gsap.from(part, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            delay: 1 + index * 0.2,
            ease: "power3.out",
          });
        });
      }
    } catch (error) {
      console.warn("Animation error:", error);
    }

    // Animate sidebar sections
    gsap.from(".sidebar-section", {
      opacity: 0,
      x: 30,
      duration: 0.8,
      stagger: 0.2,
      ease: "power3.out",
      delay: 0.5,
    })

    // Animate knowledge map
    gsap.to(".knowledge-map", {
      opacity: 0.15,
      duration: 2,
      ease: "power3.out",
      delay: 1,
    })

    // Add hover animations for answer options
    const answerOptions = document.querySelectorAll(".answer-option")

    answerOptions.forEach((option) => {
      option.addEventListener("mouseenter", function () {
        gsap.to(this, {
          y: -5,
          boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)",
          duration: 0.3,
          ease: "power2.out",
        })
      })

      option.addEventListener("mouseleave", function () {
        gsap.to(this, {
          y: 0,
          boxShadow: "none",
          duration: 0.3,
          ease: "power2.out",
        })
      })
    })

    // Add click animations for buttons
    const buttons = document.querySelectorAll("button")

    buttons.forEach((button) => {
      button.addEventListener("mousedown", function () {
        gsap.to(this, {
          scale: 0.95,
          duration: 0.1,
          ease: "power2.out",
        })
      })

      button.addEventListener("mouseup", function () {
        gsap.to(this, {
          scale: 1,
          duration: 0.1,
          ease: "power2.out",
        })
      })

      button.addEventListener("mouseleave", function () {
        gsap.to(this, {
          scale: 1,
          duration: 0.1,
          ease: "power2.out",
        })
      })
    })

    // Add custom cursor effect for quiz area
    const quizStage = document.querySelector(".quiz-stage")

    if (quizStage) {
      const cursor = document.createElement("div")
      cursor.className = "custom-cursor"
      document.body.appendChild(cursor)

      quizStage.addEventListener("mousemove", (e) => {
        gsap.to(cursor, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.1,
          ease: "power1.out",
        })
      })

      quizStage.addEventListener("mouseenter", () => {
        gsap.to(cursor, {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
        })
      })

      quizStage.addEventListener("mouseleave", () => {
        gsap.to(cursor, {
          opacity: 0,
          scale: 0.5,
          duration: 0.3,
          ease: "power2.out",
        })
      })
    }

    // Add pulsing animation to submit button
    const submitButton = document.querySelector(".submit-button")

    if (submitButton) {
      gsap.to(submitButton, {
        boxShadow: "0 0 20px rgba(110, 68, 255, 0.6)",
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    }

    // Add floating animation to topic nodes in knowledge map
    const mapNodes = document.querySelectorAll(".map-node")

    mapNodes.forEach((node, index) => {
      gsap.to(node, {
        y: gsap.utils.random(-10, 10),
        x: gsap.utils.random(-10, 10),
        duration: gsap.utils.random(3, 6),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.2,
      })
    })

    // Add animation for ability meter
    const abilityFill = document.querySelector(".ability-fill")

    if (abilityFill) {
      gsap.from(abilityFill, {
        width: "0%",
        duration: 1.5,
        ease: "power3.out",
        delay: 0.5,
      })
    }

    // Add animation for mastery bars
    const masteryFills = document.querySelectorAll(".mastery-fill")

    masteryFills.forEach((fill, index) => {
      const width = fill.style.width

      gsap.fromTo(
        fill,
        { width: "0%" },
        {
          width: width,
          duration: 1,
          ease: "power3.out",
          delay: 0.8 + index * 0.2,
        },
      )
    })

    // Add animation for question stats
    const statItems = document.querySelectorAll(".stat-item")

    statItems.forEach((item, index) => {
      gsap.from(item, {
        opacity: 0,
        x: 20,
        duration: 0.8,
        ease: "power3.out",
        delay: 1 + index * 0.2,
      })
    })
  } catch (error) {
    console.error("Error in quiz animations:", error);
    
    // Ensure visibility of key elements even if animations fail
    const questionCard = document.querySelector(".question-card");
    if (questionCard) questionCard.style.opacity = "1";
    
    const answerOptions = document.querySelectorAll(".answer-option");
    if (answerOptions) {
      answerOptions.forEach(option => {
        option.style.opacity = "1";
      });
    }
  }
});
