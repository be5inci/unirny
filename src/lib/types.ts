export type User = {
  id: string;
  name: string;
  avatar: string;
  city: string;
  university: string;
  major: string;
  interests: string[];
  purpose: 'Project' | 'Meetup' | 'Mentorship';
};

export type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: 'In-person' | 'Online';
  speaker?: string;
  description: string;
};

export type Project = {
  id: string;
  title: string;
  summary: string;
  status: 'Upcoming' | 'In Progress' | 'Completed';
  roles: string[];
  ownerId: string;
  applicants: string[];
};

export type Group = {
  id: string;
  name: string;
  category: string;
  description: string;
  members: string[];
};

export type Mentorship = {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'Active' | 'Completed' | 'Archived';
  startDate: string;
  score: number;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
  tag: string;
};
