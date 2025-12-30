'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getTagBySlug, getContentByTag, type Tag } from '@/lib/queries/tags'
import { getAllProjects } from '@/lib/queries/projects'
import { getAllRecordings } from '@/lib/queries/recordings'
import { getAllCourses } from '@/lib/queries/courses'
import Link from 'next/link'
import { ArrowRight, Tag as TagIcon, FileText, Video, BookOpen } from 'lucide-react'

export default function TagDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [tag, setTag] = useState<Tag | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<'all' | 'project' | 'recording' | 'course'>('all')
  const [projects, setProjects] = useState<any[]>([])
  const [recordings, setRecordings] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    if (slug) {
      loadTag()
    }
  }, [slug])

  async function loadTag() {
    setLoading(true)
    try {
      const { data, error } = await getTagBySlug(slug)
      if (error || !data) {
        console.error('Error loading tag:', error)
        return
      }
      
      setTag(data)
      
      // Load content by tag
      const { data: assignments } = await getContentByTag(data.id)
      if (assignments) {
        // Group by content type
        const projectIds = assignments
          .filter(a => a.content_type === 'project')
          .map(a => a.content_id)
        const recordingIds = assignments
          .filter(a => a.content_type === 'recording')
          .map(a => a.content_id)
        const courseIds = assignments
          .filter(a => a.content_type === 'course')
          .map(a => a.content_id)

        // Load full content
        const [projectsRes, recordingsRes, coursesRes] = await Promise.all([
          projectIds.length > 0 ? getAllProjects() : Promise.resolve({ data: [], error: null }),
          recordingIds.length > 0 ? getAllRecordings() : Promise.resolve({ data: [], error: null }),
          courseIds.length > 0 ? getAllCourses() : Promise.resolve({ data: [], error: null })
        ])

        if (!projectsRes.error && projectsRes.data) {
          setProjects(projectsRes.data.filter((p: any) => projectIds.includes(p.id)))
        }
        if (!recordingsRes.error && recordingsRes.data) {
          setRecordings(recordingsRes.data.filter((r: any) => recordingIds.includes(r.id)))
        }
        if (!coursesRes.error && coursesRes.data) {
          setCourses(coursesRes.data.filter((c: any) => courseIds.includes(c.id)))
        }
      }
    } catch (error) {
      console.error('Error loading tag:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <main className="transition-all duration-300 ease-in-out lg:mr-64 mr-0 lg:mt-0 mt-0">
          <div className="min-h-screen bg-gray-50">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-7xl mx-auto text-center py-12">
                טוען...
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
        <main className="transition-all duration-300 ease-in-out lg:mr-64 mr-0 lg:mt-0 mt-0">
          <div className="min-h-screen bg-gray-50">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              <div className="max-w-7xl mx-auto text-center py-12">
                <TagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">תגית לא נמצאה</h1>
                <p className="text-gray-600 mb-6">התגית שחיפשת לא קיימת</p>
                <Link
                  href="/tags"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#F52F8E] text-white rounded-lg hover:bg-[#E01E7A] transition-colors"
                >
                  חזרה לתגיות
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const totalContent = projects.length + recordings.length + courses.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/20">
      <main className="transition-all duration-300 ease-in-out lg:mr-64 mr-0 lg:mt-0 mt-0">
        <div className="min-h-screen bg-gray-50">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <Link
                  href="/tags"
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-[#F52F8E] mb-4 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  חזרה לתגיות
                </Link>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    {tag.icon && <span className="text-4xl">{tag.icon}</span>}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{tag.name}</h1>
                      {tag.description && (
                        <p className="text-gray-600 mb-4">{tag.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{tag.usage_count || 0} שימושים</span>
                        <span className="font-mono">{tag.slug}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Type Filter */}
              <div className="mb-6 flex gap-2 flex-wrap">
                <button
                  onClick={() => setContentType('all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    contentType === 'all'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  הכל ({totalContent})
                </button>
                <button
                  onClick={() => setContentType('project')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    contentType === 'project'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  פרויקטים ({projects.length})
                </button>
                <button
                  onClick={() => setContentType('recording')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    contentType === 'recording'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  הקלטות ({recordings.length})
                </button>
                <button
                  onClick={() => setContentType('course')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    contentType === 'course'
                      ? 'bg-[#F52F8E] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  קורסים ({courses.length})
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Projects */}
                {(contentType === 'all' || contentType === 'project') && projects.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#F52F8E]" />
                      פרויקטים ({projects.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#F52F8E] hover:shadow-md transition-all"
                        >
                          <h3 className="font-semibold text-gray-900 mb-2">{project.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{project.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{project.offers_count || 0} הצעות</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recordings */}
                {(contentType === 'all' || contentType === 'recording') && recordings.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5 text-[#F52F8E]" />
                      הקלטות ({recordings.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recordings.map((recording) => (
                        <Link
                          key={recording.id}
                          href={`/recordings/${recording.id}`}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#F52F8E] hover:shadow-md transition-all"
                        >
                          {recording.thumbnail_url && (
                            <div className="aspect-video bg-gray-200 relative">
                              <img
                                src={recording.thumbnail_url}
                                alt={recording.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-2">{recording.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{recording.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{recording.duration || '-'}</span>
                              <span>•</span>
                              <span>{recording.views || 0} צפיות</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Courses */}
                {(contentType === 'all' || contentType === 'course') && courses.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#F52F8E]" />
                      קורסים ({courses.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {courses.map((course) => (
                        <Link
                          key={course.id}
                          href={`/courses/${course.id}`}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#F52F8E] hover:shadow-md transition-all"
                        >
                          {course.thumbnail_url && (
                            <div className="aspect-video bg-gray-200 relative">
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{course.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{course.lessons_count || 0} שיעורים</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {totalContent === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">אין תוכן מקושר לתגית זו</p>
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

