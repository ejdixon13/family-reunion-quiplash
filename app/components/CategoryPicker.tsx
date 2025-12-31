'use client';

import { useState } from 'react';
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
      <h3 className="text-xl font-bold text-white mb-4 text-center">
        Select Categories for Each Round
        <span className="text-white/60 text-sm block mt-1">
          (Pick up to {maxCategories} - one per round)
        </span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((category, index) => {
          const isSelected = selectedCategories.includes(category.id);
          const selectionIndex = selectedCategories.indexOf(category.id);

          return (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              disabled={!isSelected && selectedCategories.length >= maxCategories}
              className={`
                relative p-4 rounded-xl text-left transition-all duration-200 transform
                ${isSelected
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 scale-105 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 hover:scale-102'}
                ${!isSelected && selectedCategories.length >= maxCategories
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'}
              `}
            >
              {isSelected && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {selectionIndex + 1}
                </span>
              )}
              <div className="text-2xl mb-1">{category.icon}</div>
              <div className="font-bold text-sm">{category.name}</div>
              <div className="text-xs opacity-80 mt-1">{category.description}</div>
            </button>
          );
        })}
      </div>

      {selectedCategories.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-white/80 text-sm mb-2">Round order:</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {selectedCategories.map((catId, index) => {
              const cat = categories.find((c) => c.id === catId);
              return (
                <span
                  key={catId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm"
                >
                  <span className="font-bold">R{index + 1}:</span>
                  <span>{cat?.icon}</span>
                  <span>{cat?.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
