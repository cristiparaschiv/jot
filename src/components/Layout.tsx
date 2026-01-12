import { ReactNode } from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { useSettingsStore } from "../store/settingsStore";

interface LayoutProps {
  sidebar: ReactNode;
  editor: ReactNode;
  preview: ReactNode;
  toc: ReactNode;
  toolbar: ReactNode;
}

export function Layout({ sidebar, editor, preview, toc, toolbar }: LayoutProps) {
  const { viewMode, activeTab } = useSettingsStore();

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-900">
      {toolbar}
      <div className="flex-1 overflow-hidden">
        <Allotment>
          {/* Sidebar - File Tree */}
          <Allotment.Pane preferredSize={250} minSize={180} maxSize={400}>
            <div className="h-full overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-800">
              {sidebar}
            </div>
          </Allotment.Pane>

          {/* Main Content Area */}
          <Allotment.Pane>
            {viewMode === "split" ? (
              <Allotment>
                <Allotment.Pane>
                  <div className="h-full flex flex-col min-h-0">
                    {editor}
                  </div>
                </Allotment.Pane>
                <Allotment.Pane>
                  <div className="h-full flex flex-col min-h-0 overflow-auto">
                    {preview}
                  </div>
                </Allotment.Pane>
              </Allotment>
            ) : (
              <div className="h-full flex flex-col min-h-0">
                {activeTab === "editor" ? editor : preview}
              </div>
            )}
          </Allotment.Pane>

          {/* Table of Contents */}
          <Allotment.Pane preferredSize={220} minSize={150} maxSize={350}>
            <div className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-800">
              {toc}
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
