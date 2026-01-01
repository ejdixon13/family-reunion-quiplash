'use client';

import { motion } from 'framer-motion';
import promptsData from '@/data/prompts.json';

interface CategoryPickerProps {
  selectedCategories: string[];
  onSelect: (categories: string[]) => void;
  maxCategories?: number;
}

export function CategoryPicker({
  selectedCategories,
  onSelect,
  maxCategories = 3
}: CategoryPickerProps) {
  const categories = promptsData.categories;

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onSelect(selectedCategories.filter((id) => id !== categoryId));
    } else if (selectedCategories.length < maxCategories) {
      onSelect([...selectedCategories, categoryId]);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <motion.div
        className="text-center mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h3 className="text-2xl font-display text-quiplash-yellow mb-2">
          Pick Your Categories
        </h3>
        <p className="text-white/60 font-body text-sm">
          Choose up to {maxCategories} - one per round
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category, index) => {
          const isSelected = selectedCategories.includes(category.id);
          const selectionIndex = selectedCategories.indexOf(category.id);
          const isDisabled = !isSelected && selectedCategories.length >= maxCategories;

          return (
            <motion.button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              disabled={isDisabled}
              className={`
                relative p-5 rounded-xl text-left transition-all duration-200
                ${isSelected
                  ? 'bg-gradient-to-br from-quiplash-yellow to-yellow-500 text-quiplash-blue shadow-lg shadow-yellow-500/30'
                  : 'glass-card text-white hover:bg-white/20'}
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: index * 0.05,
                type: 'spring',
                damping: 15,
              }}
              whileHover={!isDisabled ? { scale: 1.03, rotate: isSelected ? 0 : 2 } : {}}
              whileTap={!isDisabled ? { scale: 0.97 } : {}}
            >
              {isSelected && (
                <motion.span
                  className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-display shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  {selectionIndex + 1}
                </motion.span>
              )}
              <motion.div
                className="text-3xl mb-2"
                animate={isSelected ? { rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                {category.icon}
              </motion.div>
              <div className="font-display text-base">{category.name}</div>
              <div className={`text-xs font-body mt-1 ${isSelected ? 'text-quiplash-blue/70' : 'text-white/60'}`}>
                {category.description}
              </div>
            </motion.button>
          );
        })}
      </div>

      {selectedCategories.length > 0 && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-white/60 text-sm font-body mb-3">Round order:</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {selectedCategories.map((catId, index) => {
              const cat = categories.find((c) => c.id === catId);
              return (
                <motion.span
                  key={catId}
                  className="inline-flex items-center gap-2 px-4 py-2 glass-card text-sm font-body"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1, type: 'spring' }}
                  layout
                >
                  <span className="font-display text-quiplash-yellow">R{index + 1}</span>
                  <span>{cat?.icon}</span>
                  <span className="text-white">{cat?.name}</span>
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
