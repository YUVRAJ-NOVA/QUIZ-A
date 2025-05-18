import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

document.addEventListener("DOMContentLoaded", () => {
  // Hero section animations
  gsap.from(".hero-title", {
    opacity: 0,
    y: 50,
    duration: 1,
    ease: "power3.out",
  })

  gsap.from(".hero-subtitle", {
    opacity: 0,
    y: 30,
    duration: 1,
    delay: 0.3,
    ease: "power3.out",
  })

  gsap.from(".hero-content .cta-button", {
    opacity: 0,
    y: 20,
    duration: 1,
    delay: 0.6,
    stagger: 0.2,
    ease: "power3.out",
  })

  // Features section animations
  gsap.from(".feature-card", {
    scrollTrigger: {
      trigger: ".features",
      start: "top 80%",
    },
    opacity: 0,
    y: 50,
    duration: 0.8,
    stagger: 0.2,
    ease: "power3.out",
  })

  // Process steps animations
  gsap.from(".process-step", {
    scrollTrigger: {
      trigger: ".how-it-works",
      start: "top 80%",
    },
    opacity: 0,
    x: -50,
    duration: 0.8,
    stagger: 0.3,
    ease: "power3.out",
  })

  // CTA section animations
  gsap.from(".cta-content", {
    scrollTrigger: {
      trigger: ".cta-section",
      start: "top 80%",
    },
    opacity: 0,
    y: 50,
    duration: 0.8,
    ease: "power3.out",
  })

  // Particle animations
  const particles = document.querySelectorAll(".particle")

  particles.forEach((particle, index) => {
    gsap.to(particle, {
      x: gsap.utils.random(-50, 50),
      y: gsap.utils.random(-50, 50),
      duration: gsap.utils.random(10, 20),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.2,
    })
  })

  // Logo orbit animation enhancement
  gsap.to(".logo-planet", {
    rotation: 360,
    transformOrigin: "50% 50%",
    duration: 8,
    repeat: -1,
    ease: "none",
  })

  // Brain nodes pulsing animation enhancement
  const brainNodes = document.querySelectorAll(".brain-node")

  brainNodes.forEach((node, index) => {
    gsap.to(node, {
      scale: 1.2,
      boxShadow: "0 0 30px rgba(110, 68, 255, 0.7)",
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.3,
    })
  })

  // Brain connections animation enhancement
  const brainConnections = document.querySelectorAll(".brain-connection")

  brainConnections.forEach((connection, index) => {
    gsap.to(connection, {
      opacity: 0.8,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.2,
    })
  })

  // Floating elements animation enhancement
  const floatingElements = document.querySelectorAll(".floating-element")

  floatingElements.forEach((element, index) => {
    gsap.to(element, {
      y: gsap.utils.random(-30, 30),
      rotation: gsap.utils.random(-5, 5),
      duration: gsap.utils.random(5, 10),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: index * 0.5,
    })
  })
})
