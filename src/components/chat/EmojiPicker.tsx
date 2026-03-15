import { useState } from "react";
import { motion } from "framer-motion";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀","😂","🥹","😍","🥰","😘","😎","🤩","🥳","😇","🤗","🤔","😏","😴","🤤","🤢","🤮","🥶","🥵","😱","😨","😰","😭","😤","🤬","😈","💀","☠️","🤡","👻","👽","🤖"],
  "Gestures": ["👍","👎","👏","🙌","🤝","🙏","💪","✌️","🤞","🤙","👋","✋","🖐️","👊","✊","🫶","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥","💯","💢","💥","💫","💦","🔥"],
  "Objects": ["🎉","🎊","🎁","🏆","⭐","🌟","✨","🎵","🎶","📱","💻","📷","🎮","🎯","🎨","📚","📝","💡","🔑","💰","💎","🛒","📌","🔔","🕐","📅"],
  "Food": ["🍕","🍔","🍟","🌭","🍿","🧁","🍰","🍩","🍪","🍫","☕","🍺","🥤","🍷","🥂","🍜","🍣","🍱","🥗","🍳"],
  "Nature": ["🌸","🌺","🌻","🌹","🌷","🌿","🍀","🌈","☀️","🌙","⭐","🌊","🏔️","🌋","🐶","🐱","🐭","🐰","🦊","🐻"],
};

const QUICK_REACTIONS = ["👍","❤️","😂","😮","😢","🙏"];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  quickMode?: boolean;
}

export function EmojiPicker({ onSelect, onClose, quickMode }: Props) {
  const [activeCategory, setActiveCategory] = useState("Smileys");
  const categories = Object.keys(EMOJI_CATEGORIES);

  if (quickMode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex gap-1 bg-card rounded-full px-2 py-1 shadow-lg border border-border"
      >
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="hover:scale-125 transition-transform text-lg p-1"
          >
            {emoji}
          </button>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl shadow-xl border border-border w-72 overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
              activeCategory === cat ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto scrollbar-thin">
        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="hover:bg-muted rounded p-1 text-lg flex items-center justify-center transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export { QUICK_REACTIONS };
