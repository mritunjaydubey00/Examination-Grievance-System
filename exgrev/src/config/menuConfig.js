import {
  Bell,
  BookOpen,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";

function createMenu(basePath, grievanceItems) {
  return [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: `${basePath}/dashboard`,
    },
    {
      label: "Grievances",
      icon: ClipboardList,
      children: grievanceItems,
    },
    { label: "Guidelines", icon: BookOpen, path: `${basePath}/guidelines` },
    { label: "Profile", icon: UserRound, path: `${basePath}/profile` },
    { label: "Notice Board", icon: Bell, path: `${basePath}/notices` },
    { label: "Logout", icon: LogOut, action: "logout" },
  ];
}

export const studentMenu = createMenu("/student", [
  {
    label: "Add New",
    icon: FilePlus2,
    path: "/student/grievances/new",
  },
  {
    label: "Your Grievances",
    icon: ClipboardList,
    path: "/student/grievances/mine",
  },
]);

export const facultyMenu = createMenu("/faculty", [
  {
    label: "Active Grievances",
    icon: ClipboardList,
    path: "/faculty/grievances/active",
  },
  {
    label: "Resolved Grievances",
    icon: ClipboardList,
    path: "/faculty/grievances/resolved",
  },
]);

export const examCellMenu = createMenu("/examcell", [
  {
    label: "Active Grievances",
    icon: ClipboardList,
    path: "/examcell/grievances/active",
  },
  {
    label: "Resolved Grievances",
    icon: ClipboardList,
    path: "/examcell/grievances/resolved",
  },
]);
