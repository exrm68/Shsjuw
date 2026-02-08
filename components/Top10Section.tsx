import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, Star } from 'lucide-react';
import { Movie } from '../types';

interface Top10SectionProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
}

const Top10Section: React.FC<Top10SectionProps> = ({ movies, onMovieClick }) => {
  // ✅ Filter এবং Sort করা Top 10 Movies
  const top10Movies = useMemo(() => {
    return movies
      .filter(m => m.isTop10 === true) // শুধু যেগুলো Top 10 হিসেবে চিহ্নিত
      .sort((a, b) => {
        // প্রথমে top10Position অনুযায়ী sort করো
        const posA = a.top10Position || 999;
        const posB = b.top10Position || 999;
        if (posA !== posB) return posA - posB;
        
        // যদি position same হয় তাহলে rating অনুযায়ী
        return b.rating - a.rating;
      })
      .slice(0, 10); // শুধু প্রথম ১০টা নিবে
  }, [movies]);

  // যদি কোনো Top 10 movie না থাকে তাহলে কিছু দেখাবে না
  if (top10Movies.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="bg-gradient-to-r from-gold to-[#ff8c00] p-2 rounded-lg shadow-lg shadow-gold/20">
          <Award size={18} className="text-black" fill="black" />
        </div>
        <div>
          <h2 className="text-base font-black text-white tracking-tight uppercase flex items-center gap-2">
            Top 10 Movies
            <TrendingUp size={14} className="text-gold animate-pulse" />
          </h2>
          <p className="text-[10px] text-gray-500 font-medium">Most Popular Right Now</p>
        </div>
      </div>

      {/* Horizontal Scrollable List */}
      <div className="relative -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
          {top10Movies.map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onMovieClick(movie)}
              className="relative flex-shrink-0 w-[140px] snap-start cursor-pointer group"
            >
              {/* Ranking Number (Background) */}
              <div className="absolute -left-2 top-0 z-0 text-[80px] font-black text-white/5 leading-none select-none pointer-events-none">
                {index + 1}
              </div>

              {/* Movie Card */}
              <div className="relative z-10">
                {/* Thumbnail */}
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 shadow-xl border border-white/5 group-hover:border-gold/30 transition-all">
                  <img
                    src={movie.thumbnail}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Ranking Badge */}
                  <div className="absolute top-2 left-2 w-8 h-8 bg-gold rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-black font-black text-sm">#{index + 1}</span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-white/10">
                    <Star size={10} className="text-gold fill-gold" />
                    <span className="text-white text-[10px] font-bold">{movie.rating}</span>
                  </div>

                  {/* Premium Badge */}
                  {movie.isPremium && (
                    <div className="absolute bottom-2 left-2 bg-purple-500/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white border border-purple-400/30">
                      PREMIUM
                    </div>
                  )}
                </div>

                {/* Movie Info */}
                <div className="px-1">
                  <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight mb-1 group-hover:text-gold transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{movie.year}</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                    <span>{movie.views}</span>
                  </div>
                </div>
              </div>

              {/* Hover Effect Glow */}
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 rounded-xl transition-colors pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom Scrollbar Style */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Top10Section;
