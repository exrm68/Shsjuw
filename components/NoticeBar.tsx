import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Send } from 'lucide-react';

interface NoticeBarProps {
  text: string;
  telegramLink?: string; // Notice bar এর নিজস্ব Telegram link
  onClose?: () => void;
}

const NoticeBar: React.FC<NoticeBarProps> = ({ text, telegramLink, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (text && text.trim()) {
      setIsVisible(true);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
  }, [text]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleTelegramClick = () => {
    if (telegramLink) {
      // @ts-ignore
      if (window.Telegram?.WebApp) {
        // @ts-ignore
        window.Telegram.WebApp.openTelegramLink(telegramLink);
      } else {
        window.open(telegramLink, '_blank');
      }
    }
  };

  if (!text || !text.trim() || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="relative z-50"
      >
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-600 backdrop-blur-xl border-b border-red-500/30 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Notice Icon */}
              <div className="flex-shrink-0">
                <motion.div
                  animate={isAnimating ? { 
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1.1, 1.1, 1.1, 1]
                  } : {}}
                  transition={{ duration: 0.5 }}
                  className="w-8 h-8 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20"
                >
                  <Bell className="text-white" size={18} fill="currentColor" />
                </motion.div>
              </div>

              {/* Notice Text */}
              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-white text-sm md:text-base font-medium leading-tight truncate"
                  style={{
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
                  }}
                >
                  {text}
                </motion.p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Telegram Button (if link provided) */}
                {telegramLink && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    onClick={handleTelegramClick}
                    className="group relative px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center gap-1.5 border border-white/20 transition-all active:scale-95"
                  >
                    <Send size={14} className="text-white" />
                    <span className="text-white text-xs font-medium hidden sm:inline">Join</span>
                    
                    {/* Ripple Effect */}
                    <motion.div
                      className="absolute inset-0 rounded-full bg-white/20"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </motion.button>
                )}

                {/* Close Button */}
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  onClick={handleClose}
                  className="w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 transition-all active:scale-90"
                >
                  <X size={14} className="text-white" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Animated Bottom Border */}
          <motion.div
            className="h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NoticeBar;
