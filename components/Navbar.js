"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  BookOpen,
  ChevronDown,
  User,
  Activity,
  LogOut,
  Settings,
  Sparkles,
  Home,
  Mail,
  Bell,
  UserCheck,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import Image from "next/image";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Welcome to Learnova! 🎉",
      time: "Just now",
      read: false,
    },
    {
      id: 2,
      message: "Complete your profile to get started.",
      time: "2 min ago",
      read: false,
    },
  ]);

  const [unreadCount, setUnreadCount] = useState(2);

  const { user, userProfile, signOut, isAuthenticated } =
    useAuthContext();

  const dropdownRef = useRef(null);
  const pathname = usePathname();

  const scrollProgressValue = Number.isFinite(scrollProgress)
    ? scrollProgress
    : 0;

  // Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 100, 1);

      setScrollProgress(progress);
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  const handleClickOutside = useCallback((event) => {
    if (
      dropdownRef.current &&
      event.target &&
      !dropdownRef.current.contains(event.target)
    ) {
      setIsDropdownOpen(false);
      setIsNotificationOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [handleClickOutside]);

  // ESC Key Support
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setIsNotificationOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () =>
      window.removeEventListener(
        "keydown",
        handleEscape
      );
  }, []);

  // Prevent body scroll
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isMenuOpen]);

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
    setIsNotificationOpen(false);
  }, [pathname]);

  // Notification handlers
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );

    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
      }))
    );

    setUnreadCount(0);
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);

    await signOut();
  };

  // Helpers
  const getUserInitials = (name) => {
    if (!name) return "U";

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    if (userProfile?.fullName)
      return userProfile.fullName;

    if (user?.displayName)
      return user.displayName;

    if (user?.email)
      return user.email.split("@")[0];

    return "User";
  };

  const getUserPhoto = () => {
    return user?.photoURL || null;
  };

  const getUserRole = () => {
    if (!userProfile?.role) return "User";

    return (
      userProfile.role.charAt(0).toUpperCase() +
      userProfile.role.slice(1)
    );
  };

  const getDashboardLink = () => {
    if (!userProfile?.role) return "/profile";

    switch (userProfile.role) {
      case "student":
        return "/student/dashboard";

      case "teacher":
        return "/teacher/dashboard";

      case "institute":
        return "/institute/dashboard";

      case "admin":
        return "/admin/dashboard";

      default:
        return "/profile";
    }
  };

  const navigationItems = [
    {
      href: "/",
      label: "Home",
      icon: Home,
    },
    {
      href: "/activity",
      label: "Activities",
      icon: Activity,
    },
    {
      href: "/contact",
      label: "Contact",
      icon: Mail,
    },
  ];

  const userMenuItems = [
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      key: "profile",
    },
    {
      href: getDashboardLink(),
      icon: Activity,
      label: "Dashboard",
      key: "dashboard",
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
      key: "settings",
    },
  ].filter(
    (item) =>
      !(
        item.key === "dashboard" &&
        item.href === "/profile"
      )
  );

  const handleImageError = (e) => {
    const img = e.target;

    const fallback =
      img.parentElement?.querySelector(
        ".fallback-avatar"
      );

    if (img && fallback) {
      img.style.display = "none";
      fallback.style.display = "flex";
    }
  };

  return (
    <>
      <div
        className="fixed w-full top-0 z-[60] h-24 bg-gradient-to-b from-black/60 via-black/10 to-transparent pointer-events-none transition-opacity duration-300"
        style={{
          opacity: 1 - scrollProgressValue * 0.5,
        }}
      />

      <nav
        className="fixed w-full top-0 left-0 right-0 z-[70] transition-all duration-300 ease-out"
        style={{
          backgroundColor: `rgba(0,0,0,${
            scrollProgressValue * 0.4
          })`,
          backdropFilter: `blur(${
            scrollProgressValue * 24
          }px)`,
          WebkitBackdropFilter: `blur(${
            scrollProgressValue * 24
          }px)`,
          borderBottom: `1px solid rgba(255,255,255,${
            scrollProgressValue * 0.1
          })`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-3"
            >
              <div className="bg-gradient-to-br from-accent to-blue-500 p-2 rounded-xl">
                <BookOpen className="h-6 w-6 text-white" />
              </div>

              <div>
                <span className="text-xl font-bold text-white">
                  Learnova
                </span>

                <p className="text-xs text-white/50 uppercase">
                  Premium
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-2">

              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-accent/20 text-white"
                        : "text-white/80 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {isAuthenticated ? (
                <div className="flex items-center space-x-4 ml-6">

                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsNotificationOpen(
                          !isNotificationOpen
                        )
                      }
                      className="relative p-2 rounded-xl text-white hover:bg-white/5"
                    >
                      <Bell className="h-5 w-5" />

                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full h-4 w-4 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[52] overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                          <h3 className="text-white font-semibold">
                            Notifications
                          </h3>

                          {unreadCount > 0 && (
                            <button
                              onClick={
                                markAllAsRead
                              }
                              className="text-xs text-accent"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() =>
                                markAsRead(n.id)
                              }
                              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 ${
                                !n.read
                                  ? "bg-accent/5"
                                  : ""
                              }`}
                            >
                              <p className="text-sm text-white">
                                {n.message}
                              </p>

                              <p className="text-xs text-white/40 mt-1">
                                {n.time}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Dropdown */}
                  <div
                    className="relative"
                    ref={dropdownRef}
                  >
                    <button
                      onClick={() =>
                        setIsDropdownOpen(
                          !isDropdownOpen
                        )
                      }
                      className="flex items-center space-x-3 p-2 rounded-xl text-white hover:bg-white/5"
                    >
                      <div className="relative w-10 h-10">

                        {getUserPhoto() ? (
                          <Image
                            src={getUserPhoto()}
                            alt="Profile"
                            width={40}
                            height={40}
                            className="rounded-full object-cover border-2 border-accent/50"
                            onError={
                              handleImageError
                            }
                          />
                        ) : (
                          <div className="fallback-avatar absolute inset-0 rounded-full bg-gradient-to-br from-accent via-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                              {getUserInitials(
                                getUserDisplayName()
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="hidden md:block text-left">
                        <p className="text-sm font-medium">
                          {getUserDisplayName()}
                        </p>

                        <p className="text-xs text-white/60">
                          {getUserRole()}
                        </p>
                      </div>

                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isDropdownOpen
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-3 min-w-64 bg-black/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 py-2 z-[52]">
                        {userMenuItems.map(
                          (item) => (
                            <Link
                              key={item.key}
                              href={item.href}
                              onClick={() =>
                                setIsDropdownOpen(
                                  false
                                )
                              }
                              className="flex items-center px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                            >
                              <item.icon className="h-4 w-4 mr-3" />

                              {item.label}
                            </Link>
                          )
                        )}

                        <hr className="my-2 border-white/10" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-3 text-sm text-red-400 hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ml-6">
                  <Link href="/auth">
                    <Button className="bg-gradient-to-r from-accent to-blue-500 text-white">
                      Login / Signup
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setIsMenuOpen(!isMenuOpen)
                }
                className="text-white"
              >
                {isMenuOpen ? (
                  <X className="h-7 w-7" />
                ) : (
                  <Menu className="h-7 w-7" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[49] md:hidden"
            onClick={() =>
              setIsMenuOpen(false)
            }
          />

          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-black z-[52] md:hidden border-l border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-white text-lg font-bold">
                Menu
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setIsMenuOpen(false)
                }
                className="text-white"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="p-4 space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setIsMenuOpen(false)
                  }
                  className="flex items-center px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/5"
                >
                  <item.icon className="h-5 w-5 mr-4" />
                  {item.label}
                </Link>
              ))}

              {isAuthenticated &&
                userMenuItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() =>
                      setIsMenuOpen(false)
                    }
                    className="flex items-center px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/5"
                  >
                    <item.icon className="h-5 w-5 mr-4" />
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
