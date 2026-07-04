"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Brain,
  LineChart,
  BookOpen,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/drills", label: "每日练习", icon: Brain },
  { href: "/predictions", label: "预测跟踪", icon: LineChart },
  { href: "/journal", label: "决策日志", icon: BookOpen },
  { href: "/analytics", label: "分析面板", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavContent = ({ mobile = false }) => (
    <nav className={cn("flex flex-col gap-1", mobile ? "p-4" : "p-3")}>
      <div className="px-3 py-4 mb-2">
        <h2 className="text-lg font-bold tracking-tight">善断计划</h2>
        <p className="text-xs text-muted-foreground">判断力训练系统</p>
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full"
        >
          退出登录
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-card min-h-screen">
        <NavContent />
      </aside>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="md:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-accent"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <NavContent mobile />
        </SheetContent>
      </Sheet>
    </>
  );
}
