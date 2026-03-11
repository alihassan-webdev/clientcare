import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard, ClipboardList, PlusCircle, Users,
  LogOut, Headphones, Shield, UserCircle, FileSpreadsheet,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, SidebarSeparator, useSidebar,
} from '@/components/ui/sidebar';

const AppLayout = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!user) return null;

  const isAdmin = role === 'admin';

  const navItems = isAdmin
    ? [
        { to: '/admin/dashboard', icon: Shield, label: 'Dashboard' },
        { to: '/admin-settings', icon: Users, label: 'Users' },
        { to: '/tickets', icon: ClipboardList, label: 'Tickets' },
        { to: '/admin/reports', icon: FileSpreadsheet, label: 'Reports' },
      ]
    : [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/tickets', icon: ClipboardList, label: 'My Tickets' },
        { to: '/create-ticket', icon: PlusCircle, label: 'Create Ticket' },
        { to: '/profile', icon: UserCircle, label: 'Profile' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <SidebarContent_Inner navItems={navItems} user={user} role={role} isAdmin={isAdmin} handleLogout={handleLogout} isMobile={isMobile} />
    </SidebarProvider>
  );
};

const SidebarContent_Inner = ({ navItems, user, role, isAdmin, handleLogout, isMobile }: any) => {
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <SidebarBrand />
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item: any) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink to={item.to} end onClick={handleNavClick} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={user.name} className="cursor-default hover:bg-transparent h-auto py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                  {user.name.split(' ').map((n: string) => n[0]?.toUpperCase()).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-sidebar-accent-foreground capitalize">{user.name}</p>
                  <p className="truncate text-[10px] text-sidebar-muted capitalize">{role}</p>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-3 sm:px-4 lg:px-6">
          <SidebarTrigger />
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="text-right min-w-0 hidden sm:block">
              <p className="text-sm font-medium text-foreground truncate capitalize">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
          <div className="animate-fade-in"><Outlet /></div>
        </main>
      </div>
    </div>
  );
};

const SidebarBrand = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20">
        <Headphones className="h-4 w-4 text-sidebar-primary" />
      </div>
      {!collapsed && (
        <h1 className="text-[15px] font-heading font-bold text-sidebar-accent-foreground tracking-tight">Client Care</h1>
      )}
    </div>
  );
};

export { AppLayout };
