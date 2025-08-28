import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const CAMERA_POSITIONS = {
  home: { position: [0, 0, 12], target: [0, 0, 0] },
  about: { position: [-8, 3, 8], target: [-2, 0, 0] },
  skills: { position: [8, 3, 8], target: [2, 0, 0] },
  experience: { position: [0, -6, 10], target: [0, -2, 0] },
  projects: { position: [0, 8, 15], target: [0, 2, 0] },
  contact: { position: [0, 0, 20], target: [0, 0, 0] }
};

const THEME = {
  colors: {
    primary: '#00ffff',
    secondary: '#ff0080',
    accent: '#00ff41',
    warning: '#ffd700',
    background: '#0a0a0f',
    surface: '#1a1a2e'
  },
  animations: {
    cameraTransition: 1.5,
    hoverScale: 1.1,
    clickScale: 0.95
  }
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================
const useThreeScene = (containerRef) => {
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const animationFrameRef = useRef();

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0f, 10, 50);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(...CAMERA_POSITIONS.home.position);

    // Renderer setup with optimizations
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    containerRef.current.appendChild(renderer.domElement);

    // Store refs
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return { sceneRef, rendererRef, cameraRef, animationFrameRef };
};

// ============================================================================
// 3D SCENE COMPONENTS
// ============================================================================
const SceneManager = ({ currentSection, onInteraction }) => {
  const containerRef = useRef();
  const { sceneRef, rendererRef, cameraRef, animationFrameRef } = useThreeScene(containerRef);
  const objectsRef = useRef({});
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());

  // Lighting setup
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    
    // Ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // Key lighting
    const keyLight = new THREE.DirectionalLight(0x00ffff, 1.5);
    keyLight.position.set(10, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill lighting
    const fillLight = new THREE.DirectionalLight(0xff0080, 0.8);
    fillLight.position.set(-10, -5, 5);
    scene.add(fillLight);

    // Rim lighting
    const rimLight = new THREE.PointLight(0x00ff41, 1, 30);
    rimLight.position.set(0, 15, -10);
    scene.add(rimLight);

    objectsRef.current.lights = { keyLight, fillLight, rimLight };
  }, [sceneRef.current]);

  // Particles system
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const particleCount = 2000;
    
    // Create particle geometry
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Position in sphere
      const radius = Math.random() * 25 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - 2 * Math.random());
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Color gradient
      const hue = (Math.random() * 0.3 + 0.5) % 1;
      const color = new THREE.Color().setHSL(hue, 1, 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 1;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    objectsRef.current.particles = particles;
  }, [sceneRef.current]);

  // Navigation objects
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const navigationObjects = [];

    // Core system (center)
    const coreGeometry = new THREE.IcosahedronGeometry(1.5, 2);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00ffff,
      emissive: 0x004444,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.userData = { section: 'about', type: 'core' };
    scene.add(core);
    navigationObjects.push(core);

    // Skills satellites
    const skillsPositions = [
      [-5, 2, 0], [5, 2, 0], [0, 4, -3], [0, -2, 3]
    ];
    const skillsLabels = ['embedded', 'ai', 'software', 'hardware'];
    
    skillsPositions.forEach((pos, index) => {
      const skillGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const skillMaterial = new THREE.MeshPhysicalMaterial({
        color: index === 0 ? 0xff0080 : index === 1 ? 0x00ff41 : index === 2 ? 0xffd700 : 0xff4500,
        emissive: 0x111111,
        metalness: 0.7,
        roughness: 0.3
      });
      const skill = new THREE.Mesh(skillGeometry, skillMaterial);
      skill.position.set(...pos);
      skill.userData = { section: 'skills', type: skillsLabels[index] };
      scene.add(skill);
      navigationObjects.push(skill);
    });

    // Experience timeline
    const timelineGeometry = new THREE.CylinderGeometry(0.1, 0.1, 8);
    const timelineMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const timeline = new THREE.Mesh(timelineGeometry, timelineMaterial);
    timeline.position.set(-8, 0, 0);
    timeline.rotation.z = Math.PI / 2;
    scene.add(timeline);

    // Experience nodes
    const experienceData = [
      { pos: [-10, 1, 0], year: '2024', role: 'Firmware Engineer @ Enedis' },
      { pos: [-8, -1, 0], year: '2023', role: 'AI Engineer @ OCP Group' },
      { pos: [-6, 0.5, 0], year: '2021-2025', role: 'MSc @ Grenoble INP' }
    ];

    experienceData.forEach((exp, index) => {
      const nodeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const nodeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00ffff,
        emissive: 0x002222,
        metalness: 1,
        roughness: 0
      });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(...exp.pos);
      node.userData = { section: 'experience', type: 'node', data: exp };
      scene.add(node);
      navigationObjects.push(node);
    });

    // Projects gallery
    const projectsGeometry = new THREE.RingGeometry(2, 3, 8);
    const projectsMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff41, 
      transparent: true, 
      opacity: 0.3,
      side: THREE.DoubleSide 
    });
    const projectsRing = new THREE.Mesh(projectsGeometry, projectsMaterial);
    projectsRing.position.set(0, 8, 0);
    projectsRing.rotation.x = Math.PI / 2;
    projectsRing.userData = { section: 'projects', type: 'gallery' };
    scene.add(projectsRing);
    navigationObjects.push(projectsRing);

    objectsRef.current.navigationObjects = navigationObjects;
    objectsRef.current.core = core;
  }, [sceneRef.current]);

  // Mouse interaction
  useEffect(() => {
    if (!rendererRef.current) return;

    const handleMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleClick = () => {
      if (!cameraRef.current || !objectsRef.current.navigationObjects) return;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(objectsRef.current.navigationObjects);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        const section = object.userData.section;
        if (section && onInteraction) {
          onInteraction(section);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [onInteraction]);

  // Camera animation
  useEffect(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    const targetConfig = CAMERA_POSITIONS[currentSection] || CAMERA_POSITIONS.home;
    
    // Smooth camera transition using GSAP-like animation
    const startPosition = camera.position.clone();
    const targetPosition = new THREE.Vector3(...targetConfig.position);
    
    let progress = 0;
    const animateCamera = () => {
      progress += 0.02;
      if (progress <= 1) {
        camera.position.lerpVectors(startPosition, targetPosition, 
          // Easing function
          1 - Math.pow(1 - progress, 3)
        );
        camera.lookAt(...targetConfig.target);
        requestAnimationFrame(animateCamera);
      }
    };
    animateCamera();
  }, [currentSection]);

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;

      // Animate particles
      if (objectsRef.current.particles) {
        objectsRef.current.particles.rotation.y = time * 0.05;
        objectsRef.current.particles.rotation.x = time * 0.02;
      }

      // Animate core
      if (objectsRef.current.core) {
        objectsRef.current.core.rotation.y = time * 0.5;
        objectsRef.current.core.rotation.x = Math.sin(time * 0.3) * 0.1;
      }

      // Animate navigation objects
      if (objectsRef.current.navigationObjects) {
        objectsRef.current.navigationObjects.forEach((obj, index) => {
          if (obj.userData.type !== 'core') {
            obj.rotation.y += 0.01;
            obj.rotation.x += 0.005;
          }
        });
      }

      // Hover effects
      if (objectsRef.current.navigationObjects && cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(objectsRef.current.navigationObjects);
        
        objectsRef.current.navigationObjects.forEach(obj => {
          obj.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        });

        if (intersects.length > 0) {
          intersects[0].object.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1);
        }
      }

      // Animate lights
      if (objectsRef.current.lights) {
        const { keyLight, rimLight } = objectsRef.current.lights;
        keyLight.position.x = Math.sin(time * 0.5) * 10;
        keyLight.position.z = Math.cos(time * 0.5) * 10;
        rimLight.intensity = 0.8 + Math.sin(time * 2) * 0.4;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;

      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
};

// ============================================================================
// UI COMPONENTS
// ============================================================================
const NavigationDock = ({ currentSection, onNavigate }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'about', icon: '👨‍💻', label: 'About' },
    { id: 'skills', icon: '⚡', label: 'Skills' },
    { id: 'experience', icon: '💼', label: 'Experience' },
    { id: 'projects', icon: '🚀', label: 'Projects' },
    { id: 'contact', icon: '📧', label: 'Contact' }
  ];

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="flex items-center space-x-2 bg-black bg-opacity-80 backdrop-blur-xl rounded-full p-2 border border-cyan-500/30">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(item.id)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              currentSection === item.id
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
                : 'text-cyan-400 hover:bg-cyan-500/10'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  );
};

const HeroSection = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
  >
    <div className="text-center">
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
        className="text-6xl md:text-8xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-green-400"
        style={{ 
          fontFamily: 'Orbitron, monospace',
          textShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
        }}
      >
        TAHA AUBOUHAN
      </motion.h1>
      
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="space-y-4"
      >
        <h2 className="text-xl md:text-2xl text-purple-300 font-light">
          Senior Embedded Systems Engineer
        </h2>
        <p className="text-cyan-300 text-lg">
          Firmware • AI • Real-Time Systems • IoT
        </p>
        <div className="flex justify-center space-x-8 text-sm text-gray-400 mt-8">
          <span>🎓 MSc Embedded Systems</span>
          <span>🏢 Enedis • OCP Group</span>
          <span>📍 Grenoble, France</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5, type: 'spring' }}
        className="mt-12 text-white/60 text-sm bg-black/30 px-6 py-3 rounded-full backdrop-blur-sm"
      >
        🎮 Interact with the 3D environment to explore
      </motion.div>
    </div>
  </motion.div>
);

const AboutSection = () => (
  <motion.div
    initial={{ opacity: 0, x: -100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -100 }}
    className="absolute left-8 top-1/2 transform -translate-y-1/2 max-w-md z-20"
  >
    <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-8 border border-cyan-500/30">
      <h2 className="text-3xl font-bold text-cyan-400 mb-6">About Me</h2>
      <div className="space-y-4 text-white/90">
        <p className="leading-relaxed">
          Passionate embedded systems engineer with expertise in <strong className="text-cyan-300">firmware development</strong>, 
          <strong className="text-purple-300"> AI integration</strong>, and <strong className="text-green-300">real-time systems</strong>.
        </p>
        <p className="leading-relaxed">
          Currently pursuing MSc in Embedded Systems at <strong>Grenoble INP-Phelma</strong> with hands-on 
          experience from <strong className="text-cyan-300">Enedis</strong> and <strong className="text-purple-300">OCP Group</strong>.
        </p>
        <div className="pt-4 border-t border-gray-600">
          <h3 className="text-lg font-semibold text-green-400 mb-3">Core Expertise</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="flex items-center"><span className="text-cyan-400 mr-2">•</span>STM32/ARM Cortex</span>
            <span className="flex items-center"><span className="text-purple-400 mr-2">•</span>FreeRTOS</span>
            <span className="flex items-center"><span className="text-green-400 mr-2">•</span>TensorFlow Lite</span>
            <span className="flex items-center"><span className="text-yellow-400 mr-2">•</span>C/C++/Python</span>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

const SkillsMatrix = () => {
  const skillCategories = {
    embedded: {
      title: "🔧 Embedded Systems",
      color: "from-pink-500 to-red-500",
      skills: [
        { name: "STM32/ARM Cortex", level: 95, desc: "Advanced MCU programming & peripheral control" },
        { name: "FreeRTOS", level: 90, desc: "Real-time task scheduling & resource management" },
        { name: "Device Drivers", level: 88, desc: "Low-level hardware abstraction layers" },
        { name: "Bootloader Dev", level: 85, desc: "Custom bootloader implementation" },
        { name: "Protocol Stack", level: 92, desc: "UART, SPI, I2C, CAN, MQTT, Modbus" }
      ]
    },
    ai: {
      title: "🧠 AI & Machine Learning",
      color: "from-green-500 to-emerald-500",
      skills: [
        { name: "TensorFlow Lite", level: 87, desc: "Edge AI model deployment & optimization" },
        { name: "LSTM/GRU", level: 82, desc: "Sequential data processing & prediction" },
        { name: "Edge Computing", level: 85, desc: "Resource-constrained AI inference" },
        { name: "Signal Processing", level: 90, desc: "Digital signal analysis & filtering" },
        { name: "Model Optimization", level: 80, desc: "Quantization & pruning techniques" }
      ]
    },
    software: {
      title: "💻 Software Engineering",
      color: "from-yellow-500 to-orange-500",
      skills: [
        { name: "C/C++", level: 95, desc: "System programming & memory management" },
        { name: "Python", level: 88, desc: "Automation, ML, and rapid prototyping" },
        { name: "React/Node.js", level: 85, desc: "Full-stack web development" },
        { name: "Git/DevOps", level: 90, desc: "Version control & CI/CD pipelines" },
        { name: "Agile/Scrum", level: 85, desc: "Project management & team collaboration" }
      ]
    },
    hardware: {
      title: "⚡ Hardware & Tools",
      color: "from-orange-500 to-red-500",
      skills: [
        { name: "FPGA/VHDL", level: 75, desc: "Digital circuit design & implementation" },
        { name: "Oscilloscope", level: 92, desc: "Signal analysis & debugging" },
        { name: "Logic Analyzer", level: 88, desc: "Digital protocol debugging" },
        { name: "PCB Design", level: 70, desc: "Basic circuit board layout" },
        { name: "Lab Equipment", level: 90, desc: "Professional test & measurement" }
      ]
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-8 inset-x-8 z-20"
    >
      <div className="bg-black/85 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30">
        <h2 className="text-3xl font-bold text-center text-purple-400 mb-8">Technical Expertise Matrix</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(skillCategories).map(([key, category]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50"
            >
              <h3 className={`text-xl font-semibold mb-4 bg-gradient-to-r ${category.color} bg-clip-text text-transparent`}>
                {category.title}
              </h3>
              
              <div className="space-y-4">
                {category.skills.map((skill, index) => (
                  <div key={index} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-white">{skill.name}</span>
                      <span className="text-sm text-gray-400">{skill.level}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.level}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                        className={`h-2 rounded-full bg-gradient-to-r ${category.color}`}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {skill.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ExperienceTimeline = () => {
  const experiences = [
    {
      id: 1,
      period: "Apr - Sep 2024",
      company: "Enedis",
      role: "Firmware Engineer Intern",
      location: "France",
      achievements: [
        "Developed STM32H7-based signal generator with Qt/React.js interfaces",
        "Implemented UART/SPI/I2C protocols with MQTT/WebSockets integration",
        "Achieved 25% performance optimization through DMA and interrupt handling",
        "Customized bootloader and implemented advanced signal processing algorithms"
      ],
      technologies: ["STM32H7", "Qt", "React.js", "Node.js", "DMA", "MQTT", "WebSockets"],
      color: "cyan"
    },
    {
      id: 2,
      period: "Jun - Sep 2023",
      company: "OCP Group",
      role: "Assistant AI Engineer Intern",
      location: "Morocco",
      achievements: [
        "Developed LSTM/GRU algorithms using TensorFlow for predictive analytics",
        "Reduced prediction latency by 40% through model optimization",
        "Implemented edge computing solutions for embedded AI applications",
        "Created automated workflows using Node-RED for data processing"
      ],
      technologies: ["TensorFlow", "LSTM/GRU", "Python", "Node-RED", "Edge Computing"],
      color: "purple"
    },
    {
      id: 3,
      period: "2021 - 2025",
      company: "Grenoble INP-Phelma",
      role: "MSc Embedded Systems & IoT",
      location: "Grenoble, France",
      achievements: [
        "Specialized in Embedded Systems Design and Real-Time Operating Systems",
        "Advanced coursework in Device Drivers, DSP, and Embedded AI",
        "Hands-on experience with Bootloader Development and IoT Protocols",
        "Thesis focus on AI-optimized embedded systems for industrial applications"
      ],
      technologies: ["Embedded Systems", "RTOS", "Device Drivers", "DSP", "Embedded AI", "IoT"],
      color: "green"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="absolute left-8 top-8 bottom-8 w-1/2 z-20 overflow-y-auto"
    >
      <div className="bg-black/85 backdrop-blur-xl rounded-2xl p-8 border border-cyan-500/30 h-full">
        <h2 className="text-3xl font-bold text-cyan-400 mb-8 sticky top-0 bg-black/50 pb-4">
          💼 Professional Experience
        </h2>
        
        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Timeline connector */}
              {index < experiences.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-24 bg-gradient-to-b from-cyan-500 to-purple-500" />
              )}
              
              <div className="flex items-start space-x-6">
                {/* Timeline dot */}
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${
                  exp.color === 'cyan' ? 'from-cyan-500 to-blue-500' :
                  exp.color === 'purple' ? 'from-purple-500 to-pink-500' :
                  'from-green-500 to-emerald-500'
                } flex items-center justify-center text-white font-bold z-10`}>
                  {index + 1}
                </div>
                
                {/* Content */}
                <div className="flex-1 bg-gray-900/50 rounded-xl p-6 border border-gray-700/50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{exp.role}</h3>
                      <p className={`text-lg ${
                        exp.color === 'cyan' ? 'text-cyan-400' :
                        exp.color === 'purple' ? 'text-purple-400' :
                        'text-green-400'
                      }`}>
                        {exp.company} • {exp.location}
                      </p>
                    </div>
                    <span className="text-sm bg-gray-700 px-3 py-1 rounded-full text-gray-300 mt-2 md:mt-0">
                      {exp.period}
                    </span>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {exp.achievements.map((achievement, i) => (
                      <li key={i} className="flex items-start text-gray-300 text-sm">
                        <span className={`${
                          exp.color === 'cyan' ? 'text-cyan-400' :
                          exp.color === 'purple' ? 'text-purple-400' :
                          'text-green-400'
                        } mr-2 mt-1`}>
                          →
                        </span>
                        {achievement}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex flex-wrap gap-2">
                    {exp.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          exp.color === 'cyan' ? 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10' :
                          exp.color === 'purple' ? 'border-purple-500/30 text-purple-300 bg-purple-500/10' :
                          'border-green-500/30 text-green-300 bg-green-500/10'
                        }`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ProjectsGallery = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  
  const projects = [
    {
      id: 1,
      title: "Real-Time Operating System Kernel",
      category: "Embedded Systems",
      year: "2022",
      status: "Completed",
      description: "Custom preemptive RTOS kernel with round-robin scheduler, hardware interrupt handling, dynamic memory management, and inter-process synchronization.",
      longDescription: "Developed a complete real-time operating system kernel from scratch, implementing advanced features including preemptive multitasking with round-robin scheduling, sophisticated interrupt handling mechanisms, dynamic memory allocation with heap management, and robust inter-process communication through semaphores and message queues. The system includes custom device drivers and system calls implemented in C and Assembly, with extensive testing on ARM Cortex-M platforms.",
      technologies: ["C", "Assembly", "ARM Cortex-M", "Memory Management", "Interrupt Handling", "Device Drivers", "System Calls"],
      challenges: ["Real-time constraints", "Memory optimization", "Interrupt latency", "Context switching"],
      achievements: ["< 10μs context switch time", "99.9% real-time guarantee", "Optimized memory usage"],
      github: "https://github.com/tahaaubouhan/rtos-kernel",
      demo: null,
      image: "🔧",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "STM32H7 Advanced Signal Generator",
      category: "Firmware Development",
      year: "2024",
      status: "Production",
      description: "High-performance signal generator on STM32H7 with Qt and React.js interfaces, featuring optimized DMA operations and multi-protocol communication.",
      longDescription: "Professional-grade signal generator system built for Enedis, featuring a STM32H7 microcontroller core with dual user interfaces: a native Qt desktop application and a modern React.js web interface. The system implements multiple communication protocols (UART, SPI, I2C) with MQTT and WebSockets for remote monitoring. DMA optimization achieved 25% performance improvement, with custom bootloader for field updates and advanced signal processing algorithms for waveform generation.",
      technologies: ["STM32H7", "Qt", "React.js", "Node.js", "DMA", "UART/SPI/I2C", "MQTT", "WebSockets", "Bootloader", "DSP"],
      challenges: ["Real-time signal generation", "Multi-interface sync", "Performance optimization", "Remote monitoring"],
      achievements: ["25% performance gain via DMA", "Dual-interface architecture", "Field-updatable firmware"],
      github: "https://github.com/tahaaubouhan/stm32-signal-gen",
      demo: "https://signal-gen-demo.com",
      image: "⚡",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 3,
      title: "Embedded AI with LSTM/GRU",
      category: "Artificial Intelligence",
      year: "2023",
      status: "Deployed",
      description: "Edge computing solution with optimized LSTM/GRU algorithms using TensorFlow, achieving 40% latency reduction for real-time prediction.",
      longDescription: "Industrial AI solution developed for OCP Group, featuring custom LSTM and GRU neural networks optimized for edge deployment. The system processes real-time sensor data for predictive maintenance, with TensorFlow Lite models quantized for embedded hardware. Implemented sophisticated preprocessing pipelines and automated workflows using Node-RED. The solution demonstrates the practical application of AI in resource-constrained industrial environments.",
      technologies: ["TensorFlow", "TensorFlow Lite", "LSTM", "GRU", "Python", "Node-RED", "Edge Computing", "Model Quantization", "Embedded AI"],
      challenges: ["Model size constraints", "Real-time inference", "Power efficiency", "Data preprocessing"],
      achievements: ["40% latency reduction", "95% prediction accuracy", "Edge deployment ready"],
      github: "https://github.com/tahaaubouhan/embedded-lstm",
      demo: "https://ai-demo.ocp.com",
      image: "🧠",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      title: "IoT Connected Application Ecosystem",
      category: "Full-Stack IoT",
      year: "2023",
      status: "Active",
      description: "Comprehensive IoT architecture with Node.js/Express backend, React Native mobile app, and embedded connectivity protocols.",
      longDescription: "End-to-end IoT ecosystem developed by a team of 3 developers, featuring a robust Node.js/Express backend with real-time database integration, cross-platform React Native mobile application, and embedded device connectivity through multiple IoT protocols. The system includes RESTful APIs, real-time data streaming, device management dashboard, and comprehensive analytics. Designed for scalability and industrial deployment with security-first architecture.",
      technologies: ["Node.js", "Express", "React Native", "IoT Protocols", "RESTful APIs", "Real-time Database", "WebSockets", "MQTT", "Device Management"],
      challenges: ["Protocol integration", "Real-time synchronization", "Scalability", "Security"],
      achievements: ["3-developer team coordination", "Multi-protocol support", "Scalable architecture"],
      github: "https://github.com/tahaaubouhan/iot-ecosystem",
      demo: "https://iot-demo.com",
      image: "📱",
      color: "from-orange-500 to-red-500"
    },
    {
      id: 5,
      title: "Network ODB Optimization Engine",
      category: "Systems Programming",
      year: "2023",
      status: "Optimized",
      description: "High-performance C/C++ solution for multi-level data transfers with cross-platform device drivers and 30% latency reduction.",
      longDescription: "Advanced network optimization system built in C/C++ for high-throughput data transfers. Features custom TCP/UDP socket implementations, cross-platform device drivers for various hardware configurations, optimized memory allocation strategies, and intelligent power management. The system demonstrates deep understanding of network protocols, memory management, and system-level optimization techniques.",
      technologies: ["C/C++", "TCP/UDP Sockets", "Device Drivers", "Memory Optimization", "Cross-platform Development", "Power Management", "Network Protocols"],
      challenges: ["Cross-platform compatibility", "Memory efficiency", "Network latency", "Power consumption"],
      achievements: ["30% latency reduction", "Cross-platform drivers", "Optimized memory allocation"],
      github: "https://github.com/tahaaubouhan/network-odb",
      demo: null,
      image: "🔗",
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: 6,
      title: "Advanced Java Compiler with ANTLR4",
      category: "Compiler Design",
      year: "2023",
      status: "Educational",
      description: "Sophisticated compiler with ANTLR4 syntax analysis, assembly code generation, cross-compilation support, and comprehensive optimization.",
      longDescription: "Full-featured Java compiler implementation using ANTLR4 for lexical and syntax analysis, with advanced code generation targeting multiple assembly architectures. The project includes comprehensive optimization passes, cross-compilation support for different platforms, extensive unit testing framework, and agile development methodology with Scrum practices. Demonstrates deep understanding of compiler theory and software engineering principles.",
      technologies: ["ANTLR4", "Java", "Assembly Generation", "Cross-compilation", "Compiler Optimization", "Unit Testing", "Agile/Scrum"],
      challenges: ["Syntax analysis complexity", "Code optimization", "Cross-platform support", "Testing coverage"],
      achievements: ["Multi-target compilation", "Advanced optimizations", "Comprehensive testing"],
      github: "https://github.com/tahaaubouhan/java-compiler",
      demo: null,
      image: "⚙️",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const ProjectCard = ({ project, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.02, rotateX: 5, z: 10 }}
      onClick={() => setSelectedProject(project)}
      className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-cyan-500/50 cursor-pointer transition-all duration-300"
    >
      {/* Project icon */}
      <div className={`text-4xl mb-4 p-4 rounded-full bg-gradient-to-r ${project.color} w-fit`}>
        {project.image}
      </div>
      
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span className={`text-xs px-3 py-1 rounded-full ${
          project.status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
          project.status === 'Production' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
          project.status === 'Deployed' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
          project.status === 'Active' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
          project.status === 'Optimized' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}>
          {project.status}
        </span>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            {project.title}
          </h3>
          <p className="text-sm text-gray-400">{project.category} • {project.year}</p>
        </div>
        
        <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
          {project.description}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {project.technologies.slice(0, 3).map((tech, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 bg-gray-800/50 text-gray-300 rounded border border-gray-600/30"
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-800/50 text-gray-400 rounded border border-gray-600/30">
              +{project.technologies.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
            View Details →
          </button>
          <div className="flex space-x-2">
            {project.github && (
              <span className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </span>
            )}
            {project.demo && (
              <span className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-8 z-20 overflow-y-auto"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-green-400 to-purple-400 bg-clip-text text-transparent mb-4">
              🚀 Project Portfolio
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A collection of embedded systems, AI, and software engineering projects demonstrating 
              technical expertise and innovative problem-solving approaches.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotateX: 15 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto border border-cyan-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`text-3xl p-3 rounded-full bg-gradient-to-r ${selectedProject.color}`}>
                    {selectedProject.image}
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white">
                      {selectedProject.title}
                    </h3>
                    <p className="text-gray-400">{selectedProject.category} • {selectedProject.year}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-white text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h4 className="text-xl font-semibold text-cyan-400 mb-3">📋 Project Overview</h4>
                    <p className="text-gray-300 leading-relaxed">{selectedProject.longDescription}</p>
                  </div>

                  <div>
                    <h4 className="text-xl font-semibold text-green-400 mb-3">🛠️ Technologies & Tools</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-800/50 border border-green-500/30 text-green-300 rounded-full text-sm"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xl font-semibold text-purple-400 mb-3">🎯 Key Achievements</h4>
                    <ul className="space-y-2">
                      {selectedProject.achievements.map((achievement, i) => (
                        <li key={i} className="flex items-center text-gray-300">
                          <span className="text-purple-400 mr-3">✓</span>
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-semibold text-orange-400 mb-3">⚡ Technical Challenges</h4>
                    <ul className="space-y-2">
                      {selectedProject.challenges.map((challenge, i) => (
                        <li key={i} className="flex items-center text-gray-300 text-sm">
                          <span className="text-orange-400 mr-2">→</span>
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                    <h4 className="text-lg font-semibold text-white mb-3">Project Links</h4>
                    <div className="space-y-3">
                      {selectedProject.github && (
                        <a
                          href={selectedProject.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <span>View Source Code</span>
                        </a>
                      )}
                      {selectedProject.demo && (
                        <a
                          href={selectedProject.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Live Demo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-8 z-20 flex items-center justify-center"
    >
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Information */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-black/85 backdrop-blur-xl rounded-2xl p-8 border border-cyan-500/30"
        >
          <h2 className="text-3xl font-bold text-cyan-400 mb-8">📧 Get In Touch</h2>
          
          <div className="space-y-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                📧
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">tahaaubouhan@gmail.com</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xl">
                📱
              </div>
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white">+33 6 65 74 44 25</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl">
                📍
              </div>
              <div>
                <p className="text-sm text-gray-400">Location</p>
                <p className="text-white">Grenoble, France</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl">
                💼
              </div>
              <div>
                <p className="text-sm text-gray-400">LinkedIn</p>
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Professional Profile
                </a>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white text-xl">
                💻
              </div>
              <div>
                <p className="text-sm text-gray-400">GitHub</p>
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Open Source Projects
                </a>
              </div>
            </motion.div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-4">🎓 Current Status</h3>
            <div className="bg-gray-900/30 rounded-lg p-4 border border-green-500/20">
              <p className="text-white font-medium">MSc Embedded Systems & IoT</p>
              <p className="text-gray-400 text-sm">Grenoble INP-Phelma • Expected 2025</p>
              <p className="text-green-300 text-sm mt-2">🔍 Open to full-time opportunities</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-black/85 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/30"
        >
          <h3 className="text-2xl font-bold text-purple-400 mb-6">💌 Send Message</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                required
              >
                <option value="">Select a topic</option>
                <option value="job-opportunity">Job Opportunity</option>
                <option value="collaboration">Collaboration</option>
                <option value="consultation">Technical Consultation</option>
                <option value="project-inquiry">Project Inquiry</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={5}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-none"
                placeholder="Tell me about your project or opportunity..."
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold py-4 px-6 rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg shadow-cyan-500/20"
            >
              🚀 Send Message
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center">
              💡 <strong>Quick Response:</strong> I typically reply within 24 hours
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Portfolio3D() {
  const [currentSection, setCurrentSection] = useState('home');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = useCallback((section) => {
    setCurrentSection(section);
  }, []);

  const renderSection = useMemo(() => {
    switch (currentSection) {
      case 'home':
        return <HeroSection />;
      case 'about':
        return <AboutSection />;
      case 'skills':
        return <SkillsMatrix />;
      case 'experience':
        return <ExperienceTimeline />;
      case 'projects':
        return <ProjectsGallery />;
      case 'contact':
        return <ContactSection />;
      default:
        return <HeroSection />;
    }
  }, [currentSection]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-cyan-400 mb-2">Initializing 3D Environment</h2>
          <p className="text-gray-400">Loading embedded systems portfolio...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* 3D Scene */}
      <SceneManager 
        currentSection={currentSection} 
        onInteraction={handleNavigation}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            {renderSection}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Dock */}
      <NavigationDock 
        currentSection={currentSection} 
        onNavigate={handleNavigation} 
      />

      {/* Performance Monitor (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/80 text-white text-xs p-2 rounded border border-gray-700 z-50">
          <div>Section: {currentSection}</div>
          <div>FPS: ~60</div>
          <div>WebGL: Active</div>
        </div>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        body {
          font-family: 'Orbitron', monospace;
          overflow: hidden;
          cursor: default;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #ff00ff, #00ffff);
        }

        /* Glassmorphism effect */
        .glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Glow effects */
        .glow-cyan {
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .glow-purple {
          box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
        }

        .glow-green {
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        }
      `}</style>
    </div>
  );
}