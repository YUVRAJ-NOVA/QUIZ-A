document.addEventListener("DOMContentLoaded", () => {
  const subjectCards = document.querySelectorAll(".subject-card")
  const startQuizBtn = document.getElementById("start-quiz-btn")
  const selectionName = document.querySelector(".selection-name")
  const noSelection = document.querySelector(".no-selection")
  let selectedSubject = null

  // Initialize all animations
  initializeAnimations()

  // Add click event listeners to subject cards
  subjectCards.forEach((card) => {
    card.addEventListener("click", () => {
      // If already selected, don't do anything
      if (card.classList.contains("selected")) {
        return
      }
      
      // Remove selected class from all cards
      subjectCards.forEach((c) => c.classList.remove("selected"))
      
      // Add selected class to clicked card
      card.classList.add("selected")
      
      // Update selected subject
      selectedSubject = card.getAttribute("data-subject")
      
      // Update the display panel
      updateSelectionDisplay(selectedSubject)
      
      // Enable start quiz button
      startQuizBtn.disabled = false
      
      // Play card selection animation
      animateCardSelection(card)
    })
    
    // Add hover effects with efficient GSAP management
    card.addEventListener("mouseenter", () => {
      if (!card.classList.contains("selected")) {
        gsap.to(card.querySelector(".card-inner"), { 
          y: -5, 
          boxShadow: "0 15px 30px rgba(0, 0, 0, 0.2)",
          borderColor: "rgba(110, 68, 255, 0.2)",
          duration: 0.2,
          ease: "power2.out"
        })
        
        // Subtle animation on symbols
        gsap.to(card.querySelectorAll(".symbol"), {
          opacity: 0.3,
          scale: 1.1,
          duration: 0.3,
          stagger: 0.05,
        })
      }
    })
    
    card.addEventListener("mouseleave", () => {
      if (!card.classList.contains("selected")) {
        gsap.to(card.querySelector(".card-inner"), { 
          y: 0, 
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          borderColor: "rgba(255, 255, 255, 0.05)",
          duration: 0.2,
          ease: "power2.out"
        })
        
        // Reset symbols
        gsap.to(card.querySelectorAll(".symbol"), {
          opacity: 0.15,
          scale: 1,
          duration: 0.3,
          stagger: 0.05,
        })
      }
    })
  })
  
  // Handle start quiz button click
  startQuizBtn.addEventListener("click", () => {
    if (selectedSubject) {
      // Save selected subject to localStorage
      localStorage.setItem("selectedSubject", selectedSubject)
      
      // Button animation
      gsap.to(startQuizBtn, {
        scale: 0.95,
        duration: 0.1,
        onComplete: () => {
          // Page exit animation
          animatePageExit()
        }
      })
    }
  })
  
  // Initialize all animations
  function initializeAnimations() {
    // Setup orbit animations
    setupOrbitAnimations()
    
    // Setup entrance animations
    setupEntranceAnimations()
  }
  
  // Setup orbit animations
  function setupOrbitAnimations() {
    // Floating icons in the orbit system
    gsap.to(".floating-icon", {
      y: "random(-10, 10)",
      duration: "random(3, 5)",
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger: 0.5
    })
    
    // Pulsing animation for the center point
    gsap.to(".center-point", {
      boxShadow: "0 0 25px rgba(110, 68, 255, 0.8)",
      scale: 1.1,
      duration: 2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    })
  }
  
  // Setup entrance animations
  function setupEntranceAnimations() {
    const timeline = gsap.timeline({
      defaults: { 
        ease: "power3.out",
        duration: 0.5
      }
    })
    
    // Stagger the main content entrance
    timeline.from(".badge-container", {
      opacity: 0,
      y: 15,
    })
    .from(".selection-title", {
      opacity: 0,
      y: 20,
    }, "-=0.3")
    .from(".selection-subtitle", {
      opacity: 0,
      y: 20,
    }, "-=0.3")
    
    // Animate orbit system elements
    timeline.from([".orbit-circle", ".center-point"], {
      opacity: 0,
      scale: 0.8,
      stagger: 0.1,
    }, "-=0.3")
    .from(".floating-icon", {
      opacity: 0,
      scale: 0,
      stagger: 0.1,
    }, "-=0.2")
    
    // Animate the cards with a nice stagger
    timeline.from(".subject-card", {
      opacity: 0,
      y: 30,
      stagger: 0.1,
    }, "-=0.2")
    
    // Animate the sidebar elements
    timeline.from([".selection-info", ".info-card"], {
      opacity: 0,
      x: 20,
      stagger: 0.1,
    }, "-=0.4")
  }
  
  // Update selection display
  function updateSelectionDisplay(subject) {
    // Get the formatted subject name
    let formattedName
    switch(subject) {
      case "mathematics":
        formattedName = "Mathematics"
        break
      case "computer-science":
        formattedName = "Computer Science"
        break
      case "science":
        formattedName = "Science"
        break
      default:
        formattedName = ""
    }
    
    // Update the selection panel
    if (formattedName) {
      selectionName.textContent = formattedName
      
      // Animate the transition
      gsap.to(noSelection, {
        opacity: 0,
        display: "none",
        duration: 0.2,
        ease: "power2.out"
      })
      
      gsap.to(selectionName, {
        opacity: 1,
        display: "block",
        duration: 0.3,
        delay: 0.1,
        ease: "power2.out"
      })
    }
  }
  
  // Animate card selection
  function animateCardSelection(card) {
    // Create a timeline for selection animation
    const timeline = gsap.timeline({
      defaults: { 
        ease: "power2.out",
        duration: 0.3
      }
    })
    
    const cardInner = card.querySelector(".card-inner")
    const selectBtn = card.querySelector(".select-btn")
    
    // Animate the selected card
    timeline.to(cardInner, {
      borderColor: "var(--primary)",
      boxShadow: "0 15px 30px rgba(110, 68, 255, 0.2)",
      y: -5
    })
    .to(selectBtn, {
      backgroundColor: "var(--success)",
      scale: 1.05,
    }, "-=0.2")
    .to(card.querySelectorAll(".symbol"), {
      opacity: 0.3,
      scale: 1.1,
      stagger: 0.05
    }, "-=0.2")
    
    // Shake the start quiz button to draw attention
    timeline.to(startQuizBtn, {
      y: -5,
      duration: 0.1,
      ease: "power2.out",
      clearProps: "y",
      onComplete: () => {
        // Highlight glow effect
        gsap.fromTo(startQuizBtn, 
          { boxShadow: "0 0 0 rgba(110, 68, 255, 0)" },
          { 
            boxShadow: "0 0 20px rgba(110, 68, 255, 0.5)", 
            duration: 0.5,
            ease: "power2.out"
          }
        )
      }
    }, "-=0.1")
  }
  
  // Page exit animation
  function animatePageExit() {
    const timeline = gsap.timeline({
      defaults: { 
        ease: "power3.inOut",
        duration: 0.5
      },
      onComplete: () => {
        // Redirect to the quiz page after animations complete
        window.location.href = "quiz.html"
      }
    })
    
    // Fade out content
    timeline.to([".hero-main", ".hero-sidebar"], {
      opacity: 0,
      y: -20,
      stagger: 0.1
    })
    
    // Subtle zoom out effect
    timeline.to(".compact-selection-container", {
      scale: 0.95,
      opacity: 0,
      duration: 0.3
    }, "-=0.3")
  }
}) 