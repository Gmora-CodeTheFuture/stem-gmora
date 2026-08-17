import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

export function ParallaxComponent({ children }: { children?: React.ReactNode }) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const triggerElement = parallaxRef.current?.querySelector('[data-parallax-layers]');

    if (triggerElement) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "0% 0%",
          end: "100% 0%",
          scrub: 0
        }
      });

      const layers = [
        { layer: "1", yPercent: 70 },
        { layer: "2", yPercent: 55 },
        { layer: "3", yPercent: 40 },
        { layer: "4", yPercent: 10 }
      ];

      layers.forEach((layerObj, idx) => {
        tl.to(
          triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
          {
            yPercent: layerObj.yPercent,
            ease: "none"
          },
          idx === 0 ? undefined : "<"
        );
      });
    }

    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    return () => {
      // Clean up GSAP and ScrollTrigger instances
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.killTweensOf(triggerElement);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="parallax relative overflow-hidden" ref={parallaxRef}>
      <section className="parallax__header relative w-full h-[100vh] overflow-hidden -mt-16 z-0">
        <div className="parallax__visuals absolute inset-0">
          <div className="parallax__black-line-overflow hidden"></div>
          {/* We give the layers a taller height and offset top so they have room to translate down without cutting off */}
          <div data-parallax-layers className="parallax__layers absolute inset-0 w-full h-[130%] -top-[15%]">
            <img 
                src="https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=2000&q=80" 
                loading="eager" 
                width="800" 
                data-parallax-layer="1" 
                alt="Starry Sky" 
                className="parallax__layer-img absolute inset-0 w-full h-full object-cover object-bottom" 
            />
            <img 
                src="https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=2000&q=80" 
                loading="eager" 
                width="800" 
                data-parallax-layer="2" 
                alt="Moon" 
                className="parallax__layer-img absolute top-[10%] right-[5%] w-1/3 h-[40%] object-contain z-10 mix-blend-screen" 
            />
            
            <div data-parallax-layer="3" className="parallax__layer-title absolute inset-0 flex items-center justify-center z-20">
              <h2 className="parallax__title font-sans text-[15vw] leading-none font-bold text-white uppercase tracking-tighter mix-blend-overlay">
                  GMORA
              </h2>
            </div>
            
            <img 
                src="/images/robot_solid.png" 
                loading="eager" 
                width="800" 
                data-parallax-layer="4" 
                alt="Robot Foreground" 
                className="parallax__layer-img absolute inset-x-0 bottom-0 top-auto w-full h-[75%] object-contain object-bottom z-30 pointer-events-none" 
            />
          </div>
          <div className="parallax__fade absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-black to-transparent z-40"></div>
        </div>
      </section>
      
      <section className="parallax__content relative z-20 bg-white">
        {/* Render children passed to it, or fallback to the SVG demo */}
        {children ? children : (
            <div className="py-24 flex justify-center text-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="160" viewBox="0 0 160 160" fill="none" className="osmo-icon-svg">
                    <path d="M94.8284 53.8578C92.3086 56.3776 88 54.593 88 51.0294V0H72V59.9999C72 66.6273 66.6274 71.9999 60 71.9999H0V87.9999H51.0294C54.5931 87.9999 56.3777 92.3085 53.8579 94.8283L18.3431 130.343L29.6569 141.657L65.1717 106.142C67.684 103.63 71.9745 105.396 72 108.939V160L88.0001 160L88 99.9999C88 93.3725 93.3726 87.9999 100 87.9999H160V71.9999H108.939C105.407 71.9745 103.64 67.7091 106.12 65.1938L106.142 65.1716L141.657 29.6568L130.343 18.3432L94.8284 53.8578Z" fill="currentColor"></path>
                </svg>
            </div>
        )}
      </section>
    </div>
  );
}
