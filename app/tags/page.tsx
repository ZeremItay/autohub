'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getAllTags, getPopularTags, searchTags, type Tag } from '@/lib/queries/tags'
import Link from 'next/link'
import { Search, Tag as TagIcon, TrendingUp } from 'lucide-react'

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [popularTags, setPopularTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'alphabetical'>('popular')

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    setLoading(true)
    try {
      const [allTagsRes, popularRes] = await Promise.all([
        getAllTags(),
        getPopularTags(20)
      ])
      
      if (!allTagsRes.error && allTagsRes.data) {
        setTags(allTagsRes.data)
      }
      if (!popularRes.error && popularRes.data) {
        setPopularTags(popularRes.data)
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = useMemo(() => {
    let filtered = [...tags]
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(query) ||
        tag.slug.toLowerCase().includes(query) ||
        (tag.description && tag.description.toLowerCase().includes(query))
      )
    }
    
    // Sort
    if (sortBy === 'popular') {
      filtered.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'he'))
    }
    
    return filtered
  }, [tags, searchQuery, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <main className="transition-all duration-300 ease-in-out lg:mr-64 mr-0 lg:mt-0 mt-0">
          <div className="min-h-screen bg-gray-50">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-7xl mx-auto text-center py-12">
                טוען תגיות...
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
      <main className="transition-all duration-300 ease-in-out lg:mr-64 mr-0 lg:mt-0 mt-0">
        <div className="min-h-screen bg-gray-50">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">תגיות</h1>

              {/* Search */}
              <div className="mb-8">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="חיפוש תגיות..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F52F8E] focus:border-transparent"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Popular Tags */}
              {popularTags.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#F52F8E]" />
                    <h2 className="text-xl font-semibold text-gray-800">תגיות פופולריות</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {popularTags.slice(0, 10).map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/tags/${tag.slug}`}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-[#F52F8E] hover:bg-pink-50 transition-colors flex items-center gap-2"
                      >
                        {tag.icon && <span>{tag.icon}</span>}
                        <span className="font-medium">{tag.name}</span>
                        <span className="text-xs text-gray-500">({tag.usage_count || 0})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort Options */}
              <div className="mb-6 flex items-center gap-4">
                <span className="text-sm text-gray-600">מיין לפי:</span>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    sortBy === 'popular'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  פופולריות
                </button>
                <button
                  onClick={() => setSortBy('alphabetical')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    sortBy === 'alphabetical'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  אלפביתי
                </button>
              </div>

              {/* All Tags */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">כל התגיות ({filteredTags.length})</h2>
                {filteredTags.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">לא נמצאו תגיות</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/tags/${tag.slug}`}
                        className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#F52F8E] hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {tag.icon && <span className="text-2xl">{tag.icon}</span>}
                            <h3 className="text-lg font-semibold text-gray-900">{tag.name}</h3>
                          </div>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {tag.usage_count || 0} שימושים
                          </span>
                        </div>
                        {tag.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tag.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-mono">{tag.slug}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

