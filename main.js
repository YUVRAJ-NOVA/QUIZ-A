import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

document.addEventListener("DOMContentLoaded", function() {
    // Check if libraries loaded properly
    checkLibrariesLoaded();
    
    // Mobile navigation
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('nav ul');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for navigation links
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                if (menuToggle && menuToggle.classList.contains('active')) {
                    menuToggle.classList.remove('active');
                    navLinks.classList.remove('active');
                }
                
                // Scroll to target
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Initialize animations if GSAP is available
    if (typeof gsap !== 'undefined') {
        initAnimations();
    }

    // Register service worker for PWA functionality
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/service-worker.js")
                .then((registration) => {
                    console.log("ServiceWorker registration successful")
                })
                .catch((error) => {
                    console.log("ServiceWorker registration failed: ", error)
                })
        })
    }
});

// Function to check if libraries loaded correctly and provide fallbacks
function checkLibrariesLoaded() {
    // Check for GSAP
    if (typeof gsap === 'undefined') {
        console.warn('GSAP library failed to load. Animations will be disabled.');
        
        // Try to load GSAP dynamically as fallback
        const gsapScript = document.createElement('script');
        gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        gsapScript.onload = function() {
            console.log('GSAP loaded dynamically');
            if (typeof initAnimations === 'function') {
                initAnimations();
            }
        };
        document.head.appendChild(gsapScript);
    }
    
    // Check for ScrollTrigger plugin
    if (typeof gsap !== 'undefined' && !gsap.ScrollTrigger) {
        console.warn('GSAP ScrollTrigger plugin failed to load. Scroll animations will be disabled.');
        
        // Try to load ScrollTrigger dynamically as fallback
        const scrollTriggerScript = document.createElement('script');
        scrollTriggerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
        scrollTriggerScript.onload = function() {
            console.log('ScrollTrigger loaded dynamically');
            if (typeof initScrollAnimations === 'function') {
                initScrollAnimations();
            }
        };
        document.head.appendChild(scrollTriggerScript);
    }
    
    // Check for Chart.js in quiz page
    if (document.querySelector('#performanceChart') && typeof Chart === 'undefined') {
        console.warn('Chart.js library failed to load. Charts will not be displayed.');
        
        // Try to load Chart.js dynamically as fallback
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        chartScript.onload = function() {
            console.log('Chart.js loaded dynamically');
            // Trigger any chart initialization if needed
            const chartInitEvent = new Event('chartjsloaded');
            document.dispatchEvent(chartInitEvent);
        };
        document.head.appendChild(chartScript);
    }
}

// Basic animation function to initialize essential animations
function initAnimations() {
    // Simple fade-in for all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        gsap.fromTo(section, 
            { opacity: 0, y: 20 }, 
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.7,
                scrollTrigger: {
                    trigger: section,
                    start: "top 80%",
                    once: true
                }
            }
        );
    });
}
