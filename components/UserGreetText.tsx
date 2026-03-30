"use client";
import React, { useEffect, useState } from "react";

interface SessionUser {
  email: string;
  fullName: string;
  id: string;
}

const UserGreetText = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/session');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Prevent hydration mismatch by showing loading state initially
  if (isLoading) {
    return (
      <div className="text-sm text-gray-600">
        Loading...
      </div>
    );
  }

  if (user !== null) {
    return (
      <div className="text-sm text-gray-600">
        Hello{" "}
        <span className="font-semibold text-gray-900">
          {user.fullName ?? user.email ?? "User"}
        </span>
        !
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600">
      Welcome, Guest
    </div>
  );
};

export default UserGreetText;