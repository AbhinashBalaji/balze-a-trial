import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()
    
    let time = 0
    const dots = []
    
    // Create a grid of dots
    const cols = 60
    const rows = 40
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        dots.push({
          x: j - cols / 2, // Center x around 0
          z: i,            // Depth
        })
      }
    }
    
    const render = () => {
      // Clear background with pure black
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Wave motion time
      time += 0.03
      
      // We want to simulate a 3D camera looking down at a waving grid
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2 + 100 // push grid down slightly
      
      dots.forEach(dot => {
        // Calculate the wave height using sine waves based on x and z position
        const y = Math.sin(dot.x * 0.2 + time) * 15 + Math.cos(dot.z * 0.2 + time) * 15
        
        // 3D to 2D projection
        // We push the grid away from the camera along the z axis
        const zOffset = 20
        const z = dot.z + zOffset
        const scale = 400 / z // perspective scale
        
        // Scale and position the dot
        // Multiplying dot.x by 20 to spread them out
        const px = centerX + (dot.x * 25) * scale
        // Invert Y so positive is up, then apply scale
        const py = centerY - (y * scale) + (dot.z * 15) // slant it backwards
        
        // Calculate size based on depth
        const radius = Math.max(0.1, 1.5 * scale)
        
        // Calculate opacity based on depth (farther = fainter)
        const opacity = Math.max(0, 1 - (dot.z / rows))
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fill()
      })
      
      animationFrameId = requestAnimationFrame(render)
    }
    render()
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-none" 
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
