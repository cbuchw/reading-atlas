import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { Book } from '../types';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface WorldMapProps {
  books: Book[];
  onCountryClick?: (countryName: string) => void;
  selectedCountry?: string | null;
  onAddClick?: () => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({ books, onCountryClick, selectedCountry, onAddClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizeCountryName = (name: string) => {
    const mapping: Record<string, string> = {
      'United States': 'United States of America',
      'US': 'United States of America',
      'USA': 'United States of America',
      'UK': 'United Kingdom',
      'Great Britain': 'United Kingdom',
      'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
      'Russian Federation': 'Russia',
      'Czechia': 'Czech Republic',
      'Viet Nam': 'Vietnam',
      'Korea, Republic of': 'Korea, South',
      'Democratic People\'s Republic of Korea': 'Korea, North',
    };
    return mapping[name] || name;
  };

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    books.forEach(book => {
      book.countries?.forEach(country => {
        const mappedName = normalizeCountryName(country);
        counts[mappedName] = (counts[mappedName] || 0) + 1;
      });
    });
    return counts;
  }, [books]);

  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Only initialize the map structure once
    let g = svg.select<SVGGElement>('g.map-content');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'map-content');
      
      // Add a transparent background to capture zoom events everywhere
      svg.insert('rect', ':first-child')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .attr('class', 'zoom-capture');

      const projection = d3.geoNaturalEarth1()
        .scale(width / 5.5)
        .translate([width / 2, height / 1.8]);

      const path = d3.geoPath().projection(projection);

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
          transformRef.current = event.transform;
          g.attr('transform', event.transform);
        });

      zoomRef.current = zoom;
      svg.call(zoom);

      d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((data: any) => {
        const countries = topojson.feature(data, data.objects.countries) as any;

        const tooltip = d3.select(containerRef.current)
          .append('div')
          .attr('class', 'absolute hidden bg-ink text-white px-3 py-2 rounded-lg text-xs font-sans pointer-events-none z-50 shadow-xl border border-white/10')
          .style('backdrop-filter', 'blur(4px)');

        g.selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('class', 'country-path transition-all duration-300 cursor-pointer hover:opacity-80')
          .on('mouseover', (event, d: any) => {
            const name = d.properties.name;
            const count = countryCounts[name] || 0;
            tooltip
              .style('display', 'block')
              .html(`<span class="font-bold">${name}</span><br/><span class="opacity-60">${count} volumes</span>`);
          })
          .on('mousemove', (event) => {
            const [x, y] = d3.pointer(event, containerRef.current);
            tooltip
              .style('left', `${x + 15}px`)
              .style('top', `${y + 15}px`);
          })
          .on('mouseout', () => {
            tooltip.style('display', 'none');
          })
          .on('click', (event, d: any) => {
            if (onCountryClick) {
              onCountryClick(d.properties.name);
            }
          });

        // Initial color update
        updateMapStyles();
      });
    } else {
      updateMapStyles();
    }

    function updateMapStyles() {
      const maxCount = Math.max(...(Object.values(countryCounts) as number[]), 1);
      const colorScale = d3.scaleSequential(d3.interpolateRgb("#D6D1C4", "#4A4A38"))
        .domain([0, maxCount]);

      g.selectAll('path.country-path')
        .transition()
        .duration(500)
        .attr('fill', (d: any) => {
          const name = d.properties.name;
          const count = countryCounts[name] || 0;
          return count > 0 ? colorScale(count) : '#E8E4D8';
        })
        .attr('stroke', (d: any) => d.properties.name === selectedCountry ? '#4A4A38' : '#D6D1C4')
        .attr('stroke-width', (d: any) => d.properties.name === selectedCountry ? 1.5 : 0.5);
      
      // Maintain current zoom transform
      g.attr('transform', transformRef.current.toString());
    }

  }, [countryCounts, onCountryClick, selectedCountry]);

  if (books.length === 0) {
    return (
      <div className="w-full h-full min-h-[500px] bg-paper rounded-[3rem] border border-brass/20 shadow-inner flex flex-col items-center justify-center p-12 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <h3 className="text-4xl font-serif font-bold text-ink mb-4">A world waiting to be read</h3>
          <p className="text-ink/50 text-lg mb-10 leading-relaxed italic">
            Your map is currently a blank canvas. Add your first book to light up the world with your reading journey.
          </p>
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-3 px-8 py-4 bg-olive text-white rounded-2xl font-semibold hover:bg-olive/90 transition-all shadow-xl shadow-olive/20"
          >
            <Plus className="w-5 h-5" />
            Add your first book
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-paper rounded-[3rem] border border-brass/20 shadow-inner overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
      
      <div className="absolute bottom-8 left-8 flex flex-col gap-2 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-ink/40">Reading Density</span>
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 bg-gradient-to-r from-[#D6D1C4] to-[#4A4A38] rounded-full" />
          <span className="text-[10px] font-bold text-ink/40">High</span>
        </div>
      </div>
    </div>
  );
};
