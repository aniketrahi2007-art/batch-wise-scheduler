import { useTimetableStore } from '@/store/timetableStore';
import { TeacherManager } from '@/components/teachers/TeacherManager';
import { BatchManager } from '@/components/batches/BatchManager';
import { RoomManager } from '@/components/rooms/RoomManager';
import { AvailabilityGrid } from '@/components/availability/AvailabilityGrid';
import { TeacherMappingMatrix } from '@/components/mapping/TeacherMappingMatrix';
import { DistributionSettings } from '@/components/distribution/DistributionSettings';
import { TimetableGenerator } from '@/components/generator/TimetableGenerator';
import { TimetableView } from '@/components/timetable/TimetableView';
import {
  Users, GraduationCap, DoorOpen, CalendarCheck, Grid3x3, PieChart, Play, Table2, LayoutDashboard
} from 'lucide-react';

const tabs = [
  { id: 'teachers', label: 'Teachers', icon: Users },
  { id: 'batches', label: 'Batches', icon: GraduationCap },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen },
  { id: 'availability', label: 'Availability', icon: CalendarCheck },
  { id: 'mapping', label: 'Mapping', icon: Grid3x3 },
  { id: 'distribution', label: 'Distribution', icon: PieChart },
  { id: 'generate', label: 'Generate', icon: Play },
  { id: 'view', label: 'Timetable', icon: Table2 },
];

export default function Index() {
  const { activeTab, setActiveTab } = useTimetableStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'teachers': return <TeacherManager />;
      case 'batches': return <BatchManager />;
      case 'rooms': return <RoomManager />;
      case 'availability': return <AvailabilityGrid />;
      case 'mapping': return <TeacherMappingMatrix />;
      case 'distribution': return <DistributionSettings />;
      case 'generate': return <TimetableGenerator />;
      case 'view': return <TimetableView />;
      default: return <TeacherManager />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-sidebar-primary" />
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground">TimeTable</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Engine</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border text-[10px] text-sidebar-foreground/40">
          v1.0 · Constraint-Aware Scheduler
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
