/**
 * ============================================================================
 * Home / Dashboard Page (src/pages/Home.jsx)
 * ============================================================================
 * Redesigned dashboard inspired by skillsxchange.vercel.app.
 * Dynamically switches content, statistics, and quick actions based on
 * Learner vs. Teacher mode.
 * Contains accurate product descriptions with NO decorative emojis and NO false claims.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BRAND } from '../constants/brand.js';
import { getUserProfile } from '../api/skills.js';
import { getUserSessions, getAvailableCourses } from '../api/sessions.js';
import { getMyCourseRequests, getAllCourseRequests } from '../api/courseRequests.js';
import { getMyNotifications } from '../api/notifications.js';
import {
  DashboardIcon,
  SkillsIcon,
  SearchIcon,
  SparklesIcon,
  CalendarIcon,
  RequestIcon,
  BellIcon,
  HistoryIcon,
  CheckIcon,
  VerifiedBadgeIcon,
  ChevronRightIcon,
  UserIcon,
  ShieldCheckIcon,
} from '../components/Icons.jsx';

/**
 * Returns dynamic time-of-day greeting (e.g. "Good morning", "Good afternoon", "Good evening").
 */
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Extracts initials from name (e.g. "Kailash Sampath" -> "KS").
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'SE';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Home() {
  const { user, mode, isTeacher, isLearner } = useAuth();

  // Dashboard dynamic metrics state
  const [profileData, setProfileData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [incomingBookings, setIncomingBookings] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Available Courses state
  const [availableCourses, setAvailableCourses] = useState([]);
  const [courseCategory, setCourseCategory] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  const activeUserId = user ? user.id : 'usr_002';
  const userName = user ? user.name : 'Community Member';

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardMetrics() {
      setIsLoading(true);
      try {
        const activeRole = isTeacher ? 'teacher' : 'learner';
        // Fetch real data from PostgreSQL-backed endpoints in parallel
        const [profileRes, sessionsRes, notifsRes, userReqRes, allReqRes] = await Promise.allSettled([
          getUserProfile(activeUserId),
          getUserSessions(activeUserId, activeRole),
          user ? getMyNotifications() : Promise.resolve({ notifications: [] }),
          user ? getMyCourseRequests() : Promise.resolve({ courseRequests: [], requests: [] }),
          getAllCourseRequests(),
        ]);

        if (!isMounted) return;

        if (profileRes.status === 'fulfilled' && profileRes.value) {
          setProfileData(profileRes.value);
        }
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value) {
          const val = sessionsRes.value;
          if (isTeacher) {
            const allTeach = val.teachingSessions || val.sessions || [];
            const pendingTeach =
              val.incomingRequests ||
              allTeach.filter((s) => s.status === 'pending' || s.status === 'queued');
            const nonPendingTeach =
              val.acceptedTeachingSessions ||
              allTeach.filter((s) => s.status !== 'pending' && s.status !== 'queued');
            setIncomingBookings(pendingTeach);
            setSessions(nonPendingTeach);
          } else {
            setIncomingBookings([]);
            setSessions(val.learningSessions || val.sessions || []);
          }
        }
        if (notifsRes.status === 'fulfilled' && notifsRes.value && Array.isArray(notifsRes.value.notifications)) {
          setNotifications(notifsRes.value.notifications);
        }
        if (userReqRes.status === 'fulfilled' && userReqRes.value) {
          const reqs = userReqRes.value.courseRequests || userReqRes.value.requests || [];
          setUserRequests(Array.isArray(reqs) ? reqs : []);
        }
        if (allReqRes.status === 'fulfilled' && allReqRes.value) {
          const reqs = allReqRes.value.courseRequests || allReqRes.value.requests || [];
          setAllRequests(Array.isArray(reqs) ? reqs : []);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardMetrics();
    return () => {
      isMounted = false;
    };
  }, [activeUserId, user, mode, isTeacher]);

  useEffect(() => {
    let isMounted = true;
    async function loadCourses() {
      setIsLoadingCourses(true);
      try {
        const res = await getAvailableCourses(courseCategory, courseSearch);
        if (isMounted && res && Array.isArray(res.courses)) {
          setAvailableCourses(res.courses);
        }
      } catch (err) {
        console.error('Failed to load available courses:', err);
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    }
    loadCourses();
    return () => {
      isMounted = false;
    };
  }, [courseCategory, courseSearch]);

  // Derived counts
  const allSkills = (profileData && profileData.skills) || (user && user.skills) || [];
  const teachSkills = allSkills.filter(s => typeof s === 'string' || s.type === 'teach');
  const learnSkills = allSkills.filter(s => typeof s !== 'string' && s.type === 'learn');
  const verifiedTeachSkills = teachSkills.filter(s => typeof s === 'object' && Boolean(s.is_verified));
  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Profile setup checklist computation (5 tasks)
  const hasBio = Boolean(profileData?.bio || user?.bio || profileData?.profile_summary || user?.profile_summary);
  const hasExperience = Boolean(
    (profileData?.work_experience && profileData.work_experience.length > 0) ||
    (user?.work_experience && user.work_experience.length > 0)
  );
  const hasSocials = Boolean(
    profileData?.social_profiles && Object.keys(profileData.social_profiles).length > 0
  );
  const hasAvatar = Boolean(profileData?.avatar_url || user?.avatar_url);
  const hasSkillsAdded = allSkills.length > 0;

  const checklistItems = [
    { id: 'avatar', title: 'Profile Photo', desc: 'Upload an avatar image', completed: hasAvatar, to: '/profile#photo' },
    { id: 'summary', title: 'Professional Summary', desc: 'Add a short bio about your background', completed: hasBio, to: '/profile#summary' },
    { id: 'experience', title: 'Work Experience', desc: 'Add your past or current roles', completed: hasExperience, to: '/profile#experience' },
    { id: 'socials', title: 'Social Profiles', desc: 'Link GitHub, LinkedIn, or portfolio', completed: hasSocials, to: '/profile#socials' },
    { id: 'skills', title: 'Add Skills', desc: 'List skills you teach or want to learn', completed: hasSkillsAdded, to: '/profile#skills' },
  ];

  const completedCount = checklistItems.filter(item => item.completed).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="page">
      {/* 1. Greeting Hero Banner (inspired by reference Image 3) */}
      <section className="greeting-card">
        <div className="greeting-avatar">
          {(profileData?.avatar_url || user?.avatar_url) ? (
            <img
              src={profileData?.avatar_url || user?.avatar_url}
              alt={userName}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            getInitials(userName)
          )}
        </div>
        <div>
          <h1 className="greeting-title">
            {getTimeGreeting()}, {userName.split(' ')[0]}!
          </h1>
          <p className="greeting-subtitle">
            {isTeacher
              ? 'Ready to share your expertise? Manage your teachable skills, verify your qualifications, and mentor peers.'
              : 'Ready to exchange skills and grow together? Here is what is happening on your learning dashboard.'}
          </p>
        </div>
      </section>


      {/* 2. Stat Summary Cards Grid (Adaptive to Mode) */}
      <section className="stat-grid">
        {isLearner ? (
          <>
            <Link to="/profile#learning" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-blue">
                <SkillsIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{learnSkills.length}</div>
                <div className="stat-label">Wanted Skills</div>
                <div className="stat-desc">Skills you want to learn</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/booking" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-purple">
                <CalendarIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{sessions.length}</div>
                <div className="stat-label">Scheduled Sessions</div>
                <div className="stat-desc">Active mentoring sessions</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/recommendations" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-emerald">
                <SparklesIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">Top</div>
                <div className="stat-label">Matches</div>
                <div className="stat-desc">Recommended mentors</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/requests" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-amber">
                <RequestIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{userRequests.length}</div>
                <div className="stat-label">Course Requests</div>
                <div className="stat-desc">Skills you have requested</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/notifications" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-rose">
                <BellIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{unreadNotifications.length}</div>
                <div className="stat-label">Notifications</div>
                <div className="stat-desc">Unread community updates</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/history?view=learning" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-indigo">
                <HistoryIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">
                  {sessions.filter(s => s.status === 'completed').length}
                </div>
                <div className="stat-label">Completed</div>
                <div className="stat-desc">Past learning sessions</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>
          </>
        ) : (
          /* Teacher Mode Stats */
          <>
            <Link to="/profile#teaching" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-purple">
                <SkillsIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{teachSkills.length}</div>
                <div className="stat-label">Offered Skills</div>
                <div className="stat-desc">Skills you can teach</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/teacher-verification" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-emerald">
                <VerifiedBadgeIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{verifiedTeachSkills.length}</div>
                <div className="stat-label">Verified Badges</div>
                <div className="stat-desc">Verified skills</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/history?view=teaching" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-blue">
                <CalendarIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{sessions.length}</div>
                <div className="stat-label">Teaching Sessions</div>
                <div className="stat-desc">Active and completed</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>


            <Link to="/requests" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-amber">
                <RequestIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{incomingBookings.length + allRequests.length}</div>
                <div className="stat-label">Incoming Learner Requests</div>
                <div className="stat-desc">
                  {incomingBookings.length > 0
                    ? `${incomingBookings.length} pending 1:1 • ${allRequests.length} skill reqs`
                    : 'Pending bookings & skill requests'}
                </div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/notifications" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-rose">
                <BellIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">{unreadNotifications.length}</div>
                <div className="stat-label">Notifications</div>
                <div className="stat-desc">Unread alerts & matches</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>

            <Link to="/history?view=teaching" className="stat-card">
              <div className="stat-icon-wrapper stat-icon-indigo">
                <SparklesIcon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-value">
                  {profileData?.reputation_score ? Number(profileData.reputation_score).toFixed(1) : '5.0'}
                </div>
                <div className="stat-label">Reputation Score</div>
                <div className="stat-desc">Based on peer reviews</div>
              </div>
              <ChevronRightIcon size={18} className="stat-desc" />
            </Link>
          </>
        )}
      </section>

      {/* 3. Setup Your Profile Checklist Card (inspired by reference Image 5) */}
      <section className="checklist-card">
        <div className="checklist-header">
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>Setup Your Profile</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              {completedCount} of {checklistItems.length} completed ({progressPercent}%)
            </div>
          </div>
          <Link to="/profile" className="btn btn-sm btn-outline" style={{ gap: '0.35rem' }}>
            <span>Go to profile</span>
            <ChevronRightIcon size={14} />
          </Link>
        </div>

        <div className="progress-track">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="checklist-items-grid">
          {checklistItems.map((item) => (
            <Link key={item.id} to={item.to} className="checklist-item">
              <div className={`checklist-circle ${item.completed ? 'completed' : ''}`}>
                {item.completed ? <CheckIcon size={14} /> : null}
              </div>
              <div style={{ flex: 1 }}>
                <div className="checklist-item-title">{item.title}</div>
                <div className="checklist-item-sub">{item.desc}</div>
              </div>
              <ChevronRightIcon size={16} style={{ color: 'var(--color-text-disabled)' }} />
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Product Overview (Clear, accurate description replacing nonfunctional complexity cards) */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">About {BRAND.name}</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {BRAND.description}
        </p>

        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SkillsIcon size={18} />
              <span>Skill Exchange & Peer Mentoring</span>
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              List skills you are confident explaining or find peers teaching subjects you want to learn.
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheckIcon size={18} />
              <span>Teacher Document Verification</span>
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Teachers qualify for verified status by submitting resume and certificate credentials reviewed by designated administrators.
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RequestIcon size={18} />
              <span>Course & Skill Requests</span>
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Cannot find a skill currently offered? Post a request. When a matching teacher joins or adds the skill, you are automatically notified.
            </p>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={18} />
              <span>1:1 Session Scheduling</span>
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Arrange personalized learning sessions with qualified mentors at mutually convenient times.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Available Courses with Approved Teachers */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SkillsIcon size={22} style={{ color: 'var(--color-primary)' }} />
              <span>Available Courses with Approved Teachers</span>
            </h2>
            <p className="card-subtitle" style={{ margin: '0.25rem 0 0' }}>
              Explore catalog courses led by verified peer mentors ready for exchange sessions
            </p>
          </div>
          <Link to="/requests" className="btn btn-sm btn-outline" style={{ gap: '0.35rem' }}>
            <span>Cannot find your topic? Request it</span>
            <ChevronRightIcon size={14} />
          </Link>
        </div>

        {/* Filters bar */}
        <div className="courses-search-bar" style={{ marginBottom: '1.5rem' }}>
          <div className="courses-search-wrapper">
            <span className="courses-search-icon">
              <SearchIcon size={20} />
            </span>
            <input
              type="text"
              className="courses-search-input"
              placeholder="Search course title or description..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              aria-label="Search available courses"
            />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <select
              className="courses-category-select"
              value={courseCategory}
              onChange={(e) => setCourseCategory(e.target.value)}
              aria-label="Filter by course category"
            >
              <option value="">All Categories</option>
              <option value="Programming & Software">Programming & Software</option>
              <option value="Data Science & AI">Data Science & AI</option>
              <option value="Cloud & DevOps">Cloud & DevOps</option>
              <option value="UI/UX & Design">UI/UX & Design</option>
              <option value="Productivity & Analytics">Productivity & Analytics</option>
              <option value="Academics & Mathematics">Academics & Mathematics</option>
              <option value="Languages & Communication">Languages & Communication</option>
              <option value="Arts & Creative">Arts & Creative</option>
              <option value="Social Sciences & Psychology">Social Sciences & Psychology</option>
              <option value="Sports & Athletics">Sports & Athletics</option>
            </select>
          </div>
        </div>

        {/* Courses Grid */}
        {isLoadingCourses ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
            <p>Loading available courses...</p>
          </div>
        ) : availableCourses.length > 0 ? (
          <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
            {availableCourses.map((course) => (
              <div
                key={course.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                      {course.name}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--color-surface-elevated)',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {course.category}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {course.description || 'Verified course offering 1:1 mentorship and practical exchange.'}
                  </p>
                </div>

                <div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Approved Teachers ({course.teacher_count || (course.teachers && course.teachers.length) || 1})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {(course.teachers || []).slice(0, 3).map((teacher) => (
                        <div
                          key={teacher.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-surface-elevated)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              overflow: 'hidden',
                            }}
                          >
                            {teacher.avatar_url ? (
                              <img src={teacher.avatar_url} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              getInitials(teacher.name)
                            )}
                          </div>
                          <span style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>{teacher.name}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            ★ {Number(teacher.reputation_score || 5.0).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={`/booking?skill=${encodeURIComponent(course.name)}&mentorId=${course.teachers && course.teachers[0] ? course.teachers[0].id : ''}`}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>Book Session</span>
                    <ChevronRightIcon size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              color: 'var(--color-text-muted)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <RequestIcon size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>
              No Approved Courses Found
            </h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
              There are currently no verified teachers available for this topic. You can post a course request to alert verified educators!
            </p>
            <Link to="/requests" className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
              <RequestIcon size={14} />
              <span>Post a Course Request</span>
            </Link>
          </div>
        )}
      </section>

      {/* 6. Quick Actions & Recent Alerts Grid */}
      <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Quick Actions Card */}
        <div className="card">
          <h2 className="card-title">Quick Actions</h2>
          <p className="card-subtitle">
            {isTeacher ? 'Manage your teaching presence' : 'Get started with learning'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isLearner ? (
              <>
                <Link to="/search" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
                  <SearchIcon size={18} />
                  <span>Find a Mentor</span>
                </Link>
                <Link to="/recommendations" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                  <SparklesIcon size={18} />
                  <span>View Recommendations</span>
                </Link>
                <Link to="/requests" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <RequestIcon size={18} />
                  <span>Request an Unavailable Skill</span>
                </Link>
                <Link to="/profile" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <UserIcon size={18} />
                  <span>Update Wanted Skills</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/profile" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
                  <SkillsIcon size={18} />
                  <span>Manage Teachable Skills</span>
                </Link>
                <Link to="/teacher-verification" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                  <VerifiedBadgeIcon size={18} />
                  <span>Teacher Verification Portal</span>
                </Link>
                <Link to="/requests" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <RequestIcon size={18} />
                  <span>Browse Learner Requests</span>
                </Link>
                <Link to="/history?view=teaching" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <CalendarIcon size={18} />
                  <span>View Teaching Sessions</span>
                </Link>
              </>
            )}
          </div>
        </div>


        {/* Recent Alerts / Notifications Card (inspired by reference Image 5) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Recent Alerts</h2>
            <Link to="/notifications" className="btn btn-sm btn-outline" style={{ fontSize: '0.8rem' }}>
              View all →
            </Link>
          </div>
          <p className="card-subtitle">Updates, matches, and confirmations</p>

          {notifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: notif.is_read ? 'var(--color-bg-secondary)' : 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: notif.is_read ? '1px solid var(--color-border)' : '3px solid var(--color-primary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-disabled)' }}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {notif.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: 'var(--color-text-muted)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)'
            }}>
              <BellIcon size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.9rem' }}>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
