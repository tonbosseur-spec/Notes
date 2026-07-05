import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Note } from '../types';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, Settings2, Search, Sliders, Info, Eye, X, BookOpen, Link } from 'lucide-react';

interface GraphViewProps {
  notes: Note[];
  onOpenNote: (id: string) => void;
  onClose: () => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  isGhost?: boolean;
  val: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export default function GraphView({ notes, onOpenNote, onClose }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [repulsion, setRepulsion] = useState(-150);
  const [linkDistance, setLinkDistance] = useState(80);
  const [showLabels, setShowLabels] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Check screen size to set mobile mode on load and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setRepulsion(-80);
        setLinkDistance(55);
        // Hide labels by default if too many notes on mobile
        if (notes.length > 25) {
          setShowLabels(false);
        }
      } else {
        setRepulsion(-200);
        setLinkDistance(100);
        setShowLabels(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [notes.length]);

  // Parse links from note HTML content
  const getGraphData = () => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    
    const noteMap = new Map<string, Note>();
    const titleToIdMap = new Map<string, string>();
    
    notes.forEach(note => {
      noteMap.set(note.id, note);
      titleToIdMap.set(note.title.toLowerCase(), note.id);
    });

    // 1. Collect all real nodes
    notes.forEach(note => {
      nodes.push({
        id: note.id,
        title: note.title || 'Sans titre',
        val: Math.max(isMobile ? 8 : 10, (note.content || '').length / 120 + (isMobile ? 6 : 8)),
      });
    });

    // 2. Discover links and possible "ghost" nodes
    const ghostNotes = new Map<string, string>(); // lowercase title -> title

    notes.forEach(note => {
      const hrefRegex = /href="note:([^"]+)"/g;
      let match;
      const content = note.content || '';
      
      while ((match = hrefRegex.exec(content)) !== null) {
        const targetRef = decodeURIComponent(match[1]);
        
        let targetId = '';
        
        if (noteMap.has(targetRef)) {
          targetId = targetRef;
        } else {
          const foundId = titleToIdMap.get(targetRef.toLowerCase());
          if (foundId) {
            targetId = foundId;
          } else {
            ghostNotes.set(targetRef.toLowerCase(), targetRef);
            targetId = `ghost-${targetRef.toLowerCase()}`;
          }
        }

        if (targetId && targetId !== note.id) {
          const exists = links.some(l => 
            (l.source === note.id && l.target === targetId) ||
            (l.source === targetId && l.target === note.id)
          );
          if (!exists) {
            links.push({
              source: note.id,
              target: targetId,
            });
          }
        }
      }
    });

    // 3. Add ghost nodes to the nodes list
    ghostNotes.forEach((originalTitle, lowerTitle) => {
      nodes.push({
        id: `ghost-${lowerTitle}`,
        title: originalTitle,
        isGhost: true,
        val: isMobile ? 5 : 6,
      });
    });

    return { nodes, links };
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    const { nodes, links } = getGraphData();
    
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Main group that holds all visual elements for zoom/pan
    const g = svg.append('g').attr('class', 'graph-content');

    // Zoom setup
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Initial positioning / Centering zoom
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(0, 0).scale(isMobile ? 0.95 : 1));

    // Simulation setup
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(repulsion))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.val + (isMobile ? 12 : 16)));

    // Neighbors helper to highlight node neighborhoods
    const getNeighborsAndActive = (nodeId: string | null) => {
      if (!nodeId) return null;
      const set = new Set<string>();
      set.add(nodeId);
      links.forEach(l => {
        const sId = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const tId = typeof l.target === 'string' ? l.target : (l.target as any).id;
        if (sId === nodeId) set.add(tId);
        if (tId === nodeId) set.add(sId);
      });
      return set;
    };

    // Determine target highlight node (either hovered or active/selected)
    const highlightTargetId = hoveredNodeId || activeNodeId;
    const activeNeighborhood = getNeighborsAndActive(highlightTargetId);

    // Render Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (l: any) => {
        if (!highlightTargetId) return l.source.isGhost || l.target.isGhost ? '#d6d3d1' : '#a78bfa';
        const sId = (l.source as any).id;
        const tId = (l.target as any).id;
        return (sId === highlightTargetId || tId === highlightTargetId) ? '#6366f1' : '#e2e8f0';
      })
      .attr('stroke-opacity', (l: any) => {
        if (!highlightTargetId) return 0.6;
        const sId = (l.source as any).id;
        const tId = (l.target as any).id;
        return (sId === highlightTargetId || tId === highlightTargetId) ? 1.0 : 0.1;
      })
      .attr('stroke-width', (l: any) => {
        if (!highlightTargetId) return 1.5;
        const sId = (l.source as any).id;
        const tId = (l.target as any).id;
        return (sId === highlightTargetId || tId === highlightTargetId) ? 2.5 : 1.0;
      })
      .attr('stroke-dasharray', (d: any) => d.source.isGhost || d.target.isGhost ? '3,3' : 'none');

    // Render Nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Draw circles with enhanced visibility and touch size
    const circles = node.append('circle')
      .attr('r', (d: any) => {
        let r = d.val;
        if (d.id === activeNodeId) r = d.val * 1.35;
        else if (hoveredNodeId === d.id) r = d.val * 1.25;
        else if (searchQuery && d.title.toLowerCase().includes(searchQuery.toLowerCase())) r = d.val * 1.3;
        return r;
      })
      .attr('fill', (d: any) => {
        if (d.id === activeNodeId) return '#ec4899'; // Hot pink for selected/active
        if (searchQuery && d.title.toLowerCase().includes(searchQuery.toLowerCase())) return '#f43f5e'; // Highlight match
        if (d.isGhost) return '#d6d3d1'; // Gray for ghost/uncreated
        return '#6366f1'; // Indigo for regular
      })
      .attr('stroke', (d: any) => {
        if (d.id === activeNodeId) return '#db2777';
        if (d.isGhost) return '#78716c';
        return '#4f46e5';
      })
      .attr('stroke-width', (d: any) => d.id === activeNodeId ? 2.5 : 1.5)
      .attr('opacity', (d: any) => {
        if (!activeNeighborhood) return 1.0;
        return activeNeighborhood.has(d.id) ? 1.0 : 0.2;
      })
      .attr('class', 'transition-all duration-200');

    // Display labels with smart visibility
    const labels = node.append('text')
      .text((d: any) => d.title)
      .attr('dy', (d: any) => d.val + (isMobile ? 12 : 14))
      .attr('text-anchor', 'middle')
      .attr('font-size', isMobile ? '9px' : '10px')
      .attr('font-weight', (d: any) => d.id === activeNodeId ? '700' : '500')
      .attr('fill', 'currentColor')
      .attr('class', 'text-stone-700 dark:text-stone-300 pointer-events-none select-none')
      .style('opacity', (d: any) => {
        if (!showLabels) {
          // If labels globally hidden, only show if active or hovered
          return (d.id === activeNodeId || d.id === hoveredNodeId) ? 1 : 0;
        }
        if (!activeNeighborhood) return 1;
        return activeNeighborhood.has(d.id) ? 1 : 0.25;
      });

    // Interactivity triggers
    node.on('mouseover', function (event, d: any) {
      if (!isMobile) {
        setHoveredNodeId(d.id);
      }
    });

    node.on('mouseout', function (event, d: any) {
      if (!isMobile) {
        setHoveredNodeId(null);
      }
    });

    node.on('click', (event, d: any) => {
      event.stopPropagation();
      // On mobile/desktop: select node to highlight connections and show preview bottom sheet
      setActiveNodeId(d.id);
    });

    // Clicking background clears active/selected node
    svg.on('click', () => {
      setActiveNodeId(null);
      setHoveredNodeId(null);
    });

    // Update simulation positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Zoom helpers exposure
    const zoomIn = () => svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
    const zoomOut = () => svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.7);
    const resetZoom = () => svg.transition().duration(350).call(zoomBehavior.transform, d3.zoomIdentity.translate(0, 0).scale(isMobile ? 0.95 : 1));

    (window as any)._graphZoomIn = zoomIn;
    (window as any)._graphZoomOut = zoomOut;
    (window as any)._graphResetZoom = resetZoom;

    // Draggability functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [notes, searchQuery, repulsion, linkDistance, showLabels, activeNodeId, hoveredNodeId, isMobile]);

  // Find active note object
  const activeNote = notes.find(n => n.id === activeNodeId);
  const isGhostNote = activeNodeId && activeNodeId.startsWith('ghost-');
  const ghostTitle = isGhostNote ? activeNodeId?.substring(6) : '';

  // Get note content plain text preview
  const getNotePreview = (htmlContent: string) => {
    if (!htmlContent) return 'Aucun contenu.';
    const stripped = htmlContent.replace(/<[^>]*>/g, ' ');
    const cleaned = stripped.replace(/\s+/g, ' ').trim();
    return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden animate-fadeIn">
      {/* Header Bar */}
      <header className="relative flex items-center justify-between px-4 py-3 sm:px-6 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-xs z-20">
        
        {/* Normal Header elements (hidden on mobile if search is active) */}
        <div className={`flex items-center gap-3 ${isMobile && showSearchMobile ? 'hidden' : 'flex'}`}>
          <button 
            onClick={onClose}
            className="p-2 -ml-1 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Retour au menu principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
              <span>Graphe</span>
              <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                {notes.length}
              </span>
            </h2>
            <p className="text-xs text-stone-400 dark:text-stone-500 hidden sm:block">Explorez de manière interactive les liens de votre carnet.</p>
          </div>
        </div>

        {/* Desktop / Non-mobile search bar */}
        <div className="hidden md:flex items-center gap-2 max-w-xs w-full">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une note..." 
              className="w-full pl-9 pr-4 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-stone-900 dark:text-stone-100"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                Vider
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
            title="Paramètres de physique"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile active search mode (takes full header height) */}
        {isMobile && showSearchMobile && (
          <div className="flex items-center gap-2 w-full animate-fadeIn">
            <button 
              onClick={() => {
                setShowSearchMobile(false);
                setSearchQuery('');
              }}
              className="p-2 -ml-2 rounded-xl text-stone-500 hover:text-stone-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une note..." 
                autoFocus
                className="w-full pl-9 pr-8 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-stone-900 dark:text-stone-100"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile controls triggers (visible when search is not full-screen) */}
        {isMobile && !showSearchMobile && (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setShowSearchMobile(true)}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-500 bg-white dark:bg-stone-900 cursor-pointer"
              title="Rechercher"
            >
              <Search className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-500'}`}
              title="Paramètres"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Canvas/Graph Stage Area */}
      <div className="flex-1 relative" ref={containerRef}>
        
        {/* Floating Controls (Zoom, Reset) */}
        <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-2">
          <div className="flex items-center gap-1 p-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-2xl shadow-md border border-stone-200/40 dark:border-stone-800/40">
            <button 
              onClick={() => (window as any)._graphZoomIn?.()} 
              className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
              title="Zoomer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={() => (window as any)._graphZoomOut?.()} 
              className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
              title="Dézoomer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button 
              onClick={() => (window as any)._graphResetZoom?.()} 
              className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
              title="Recadrer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Physics and display drawer */}
        {showSettings && (
          <div className="absolute right-4 top-4 z-10 w-[280px] p-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/50 dark:border-stone-800/50 space-y-4 animate-in slide-in-from-right-5 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-400 dark:text-stone-500">Paramètres de physique</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Display Labels Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Afficher les titres</span>
                <button 
                  onClick={() => setShowLabels(!showLabels)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${showLabels ? 'bg-indigo-600' : 'bg-stone-300 dark:bg-stone-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showLabels ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Repulsion Force */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-stone-500">
                  <span>Dispersion (Répulsion)</span>
                  <span>{-repulsion}</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="400" 
                  step="10"
                  value={-repulsion} 
                  onChange={(e) => setRepulsion(-Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Link Distance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-stone-500">
                  <span>Proximité des liens</span>
                  <span>{linkDistance}px</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="180" 
                  step="5"
                  value={linkDistance} 
                  onChange={(e) => setLinkDistance(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex gap-2 text-[10px] text-stone-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Faites glisser les notes pour réagencer l'espace en temps réel.</span>
            </div>
          </div>
        )}

        {/* Selected note visual confirmation overlay - hidden on mobile in favor of the bottom sheet card */}
        {!isMobile && !activeNodeId && (
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs border border-stone-200/40 dark:border-stone-800/40 rounded-xl text-xs flex items-center gap-2 pointer-events-none text-stone-500">
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sélectionnez une note pour voir ses relations directes.</span>
          </div>
        )}

        {/* D3 Canvas/SVG Stage */}
        <svg 
          ref={svgRef} 
          className="w-full h-full bg-stone-50 dark:bg-[#0c0a09] transition-colors duration-300"
        />

        {/* BOTTOM CARD: Unified and beautiful Note details panel/Bottom sheet */}
        {activeNodeId && (
          <div className="absolute bottom-6 right-4 left-4 md:left-auto md:w-[350px] z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-200/60 dark:border-stone-800/60 shadow-xl p-4 sm:p-5 animate-in slide-in-from-bottom-5 duration-200">
            
            {/* Note Header / Actions */}
            <div className="flex justify-between items-start mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {isGhostNote ? <Link className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                {isGhostNote ? 'Note virtuelle' : 'Note active'}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNodeId(null);
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 -mr-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Note Title & Content preview */}
            <div className="space-y-1 mb-4">
              <h3 className="font-bold text-stone-900 dark:text-stone-50 text-base leading-tight tracking-tight">
                {activeNote ? activeNote.title : (isGhostNote ? ghostTitle : 'Sans titre')}
              </h3>
              <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed line-clamp-2">
                {activeNote ? getNotePreview(activeNote.content) : (isGhostNote ? "Cette note n'a pas encore été créée, mais elle est mentionnée ou liée depuis d'autres notes." : 'Aucun contenu.')}
              </p>
            </div>

            {/* Interactive action buttons */}
            <div className="flex gap-2">
              {activeNote ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNote(activeNote.id);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ouvrir la note</span>
                </button>
              ) : (
                <div className="text-[11px] text-stone-400 bg-stone-100/50 dark:bg-stone-800/40 p-2.5 rounded-xl w-full text-center font-medium">
                  Créez cette note en liant son titre dans l'éditeur.
                </div>
              )}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNodeId(null);
                }}
                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                Masquer
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
