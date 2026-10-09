/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TOOLS } from './data/tools';
import { ToolItem } from './types';

// Layout components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToolLayout } from './components/common/ToolLayout';

// Pages
import { Home } from './pages/Home';
import { AllTools } from './pages/AllTools';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ContactPage } from './pages/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Image Tools
import { ImageConverter } from './components/tools/image/ImageConverter';
import { ImageCropTool } from './components/tools/image/ImageCropTool';
import { ImageRotateFlipTool } from './components/tools/image/ImageRotateFlipTool';
import { ImageEffectsTool } from './components/tools/image/ImageEffectsTool';
import { ImageJoinerTool } from './components/tools/image/ImageJoinerTool';
import { ImageWatermarkTool } from './components/tools/image/ImageWatermarkTool';

// Resize & DPI Tools
import { ResizeCompressionTool } from './components/tools/resize/ResizeCompressionTool';
import { SignatureResizeTool } from './components/tools/resize/SignatureResizeTool';
import { A4ResizeTool } from './components/tools/resize/A4ResizeTool';
import { ImageSizeCalculator } from './components/tools/resize/ImageSizeCalculator';

// Passport Tools
import { PassportPhotoMaker } from './components/tools/passport/PassportPhotoMaker';
import { PassportSheetMaker } from './components/tools/passport/PassportSheetMaker';
import { MultiSizePassportTool } from './components/tools/passport/MultiSizePassportTool';

// Studio & Merge Tools
import { AdvancedPhotoStudio } from './components/tools/photo/AdvancedPhotoStudio';
import { PhotoSignatureMergeTool } from './components/tools/photo/PhotoSignatureMergeTool';

// PDF Tools
import { ImageToPdfTool } from './components/tools/pdf/ImageToPdfTool';
import { PdfManagerTool } from './components/tools/pdf/PdfManagerTool';
import { PdfToTextTool } from './components/tools/pdf/PdfToTextTool';
import { ScanToPdfTool } from './components/tools/pdf/ScanToPdfTool';

// Document Tools
import { FourCornerPerspectiveTool } from './components/tools/document/FourCornerPerspectiveTool';
import { DocumentEnhancementTool } from './components/tools/document/DocumentEnhancementTool';
import { IdCardMakerTool } from './components/tools/document/IdCardMakerTool';

// Biodata & Resume Tools
import { BiodataMakerTool } from './components/tools/biodata/BiodataMakerTool';
import { ResumeMakerTool } from './components/tools/biodata/ResumeMakerTool';

// Other Utilities
import { SocialMediaResizer } from './components/tools/other/SocialMediaResizer';
import { FaviconGenerator } from './components/tools/other/FaviconGenerator';

// Platform Themes (Android Material 3 & PC Windows Fluent)
import { PlatformThemeProvider, usePlatformTheme } from './context/PlatformThemeContext';
import { PcTitleBar } from './components/platform/PcTitleBar';
import { PcStatusBar } from './components/platform/PcStatusBar';
import { AndroidBottomNav } from './components/platform/AndroidBottomNav';
import { AndroidFloatingActionButton } from './components/platform/AndroidFloatingActionButton';
import { AndroidCategoriesSheet } from './components/platform/AndroidCategoriesSheet';
import { PlatformSwitcherModal } from './components/platform/PlatformSwitcherModal';
import { AppInstallModal } from './components/layout/AppInstallModal';

function MainApp() {
  const { activePlatform, isAndroid, isPC } = usePlatformTheme();
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showCategoriesSheet, setShowCategoriesSheet] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  // Navigation State
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || 'home';
  });

  // Photo passed from passport maker to sheet maker if chained
  const [transitPhotoUrl, setTransitPhotoUrl] = useState<string | null>(null);

  // Favorites & Recents in LocalStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('snapdoc_favorites');
      return saved ? JSON.parse(saved) : ['passport-photo-maker', 'reduce-image-size', 'biodata-maker'];
    } catch {
      return [];
    }
  });

  const [recentTools, setRecentTools] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('snapdoc_recent_tools');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const saved = localStorage.getItem('snapdoc_theme');
      return (saved as any) || 'system';
    } catch {
      return 'system';
    }
  });

  // Apply Theme
  useEffect(() => {
    localStorage.setItem('snapdoc_theme', theme);
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Sync hash routing for browser Back/Forward/Refresh (PRD #82)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      setCurrentPage(hash || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: string) => {
    window.location.hash = page;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // If navigating to a tool, record in recent tools (max 6 items per PRD #9)
    if (page.startsWith('tool:')) {
      const slug = page.replace('tool:', '');
      const tool = TOOLS.find((t) => t.slug === slug);
      if (tool) {
        setRecentTools((prev) => {
          const updated = [tool.id, ...prev.filter((id) => id !== tool.id)].slice(0, 6);
          try {
            localStorage.setItem('snapdoc_recent_tools', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    }
  };

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId];
      try {
        localStorage.setItem('snapdoc_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Render Tool Component mapping
  const renderToolComponent = (tool: ToolItem) => {
    switch (tool.slug) {
      // Basic Image Tools
      case 'image-converter':
        return <ImageConverter initialFormat="jpeg" />;
      case 'image-to-jpg':
        return <ImageConverter initialFormat="jpeg" />;
      case 'image-to-png':
        return <ImageConverter initialFormat="png" />;
      case 'image-to-webp':
        return <ImageConverter initialFormat="webp" />;
      case 'crop-image':
        return <ImageCropTool />;
      case 'rotate-image':
        return <ImageRotateFlipTool />;
      case 'round-corners':
      case 'image-effects':
        return <ImageEffectsTool />;
      case 'join-images':
        return <ImageJoinerTool />;
      case 'watermark-image':
        return <ImageWatermarkTool />;

      // Resize & DPI
      case 'reduce-image-size':
        return <ResizeCompressionTool initialMode="target-size" />;
      case 'resize-image':
        return <ResizeCompressionTool initialMode="dimension" />;
      case 'convert-dpi':
        return <ResizeCompressionTool initialMode="dpi" />;
      case 'a4-image-resize':
        return <A4ResizeTool />;
      case 'resize-signature':
        return <SignatureResizeTool />;
      case 'image-size-calculator':
        return <ImageSizeCalculator />;

      // Passport Tools
      case 'passport-photo-maker':
      case 'passport-presets':
      case 'passport-background-changer':
        return (
          <PassportPhotoMaker
            onGoToSheet={(url) => {
              setTransitPhotoUrl(url);
              navigateTo('tool:passport-sheet-maker');
            }}
          />
        );
      case 'passport-sheet-maker':
        return <PassportSheetMaker initialPhotoUrl={transitPhotoUrl} />;
      case 'multi-size-photo-generator':
        return <MultiSizePassportTool />;

      // Studio
      case 'advanced-photo-studio':
        return <AdvancedPhotoStudio />;
      case 'photo-signature-merge':
        return <PhotoSignatureMergeTool />;

      // PDF Tools
      case 'image-to-pdf':
        return <ImageToPdfTool />;
      case 'pdf-manager':
      case 'pdf-watermark':
      case 'pdf-metadata-viewer':
        return <PdfManagerTool />;
      case 'pdf-to-text':
        return <PdfToTextTool />;
      case 'scan-to-pdf':
        return <ScanToPdfTool />;

      // Document Tools
      case 'four-corner-correction':
        return <FourCornerPerspectiveTool />;
      case 'document-enhancement':
        return <DocumentEnhancementTool />;
      case 'id-card-maker':
        return <IdCardMakerTool />;

      // Biodata & Resume
      case 'biodata-maker':
        return <BiodataMakerTool />;
      case 'resume-maker':
        return <ResumeMakerTool />;

      // Other
      case 'social-media-resizer':
        return <SocialMediaResizer />;
      case 'favicon-generator':
        return <FaviconGenerator />;

      default:
        return <NotFoundPage onNavigateHome={() => navigateTo('home')} />;
    }
  };

  // Main Page Switcher
  const renderPage = () => {
    if (currentPage === 'home' || currentPage === '') {
      return (
        <Home
          onNavigate={navigateTo}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    if (currentPage === 'all-tools') {
      return (
        <AllTools
          onNavigate={navigateTo}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    if (currentPage === 'about') {
      return <AboutPage onNavigate={navigateTo} />;
    }

    if (currentPage === 'privacy') {
      return <PrivacyPage />;
    }

    if (currentPage === 'terms') {
      return <TermsPage />;
    }

    if (currentPage === 'contact') {
      return <ContactPage />;
    }

    // Specific Tool Route: "tool:slug"
    if (currentPage.startsWith('tool:')) {
      const slug = currentPage.replace('tool:', '');
      const tool = TOOLS.find((t) => t.slug === slug);
      if (!tool) {
        return <NotFoundPage onNavigateHome={() => navigateTo('home')} />;
      }

      return (
        <ToolLayout
          tool={tool}
          isFavorite={favorites.includes(tool.id)}
          onToggleFavorite={() => toggleFavorite(tool.id)}
          onNavigateHome={() => navigateTo('home')}
        >
          {renderToolComponent(tool)}
        </ToolLayout>
      );
    }

    // Category Page Route: "category:catId"
    if (currentPage.startsWith('category:')) {
      return (
        <AllTools
          onNavigate={navigateTo}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      );
    }

    return <NotFoundPage onNavigateHome={() => navigateTo('home')} />;
  };

  return (
    <div
      className={`flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors ${
        isAndroid ? 'theme-android' : 'theme-pc'
      }`}
    >
      {/* PC Windows Fluent Titlebar on PC */}
      {isPC && (
        <PcTitleBar
          currentPage={currentPage}
          onOpenPlatformModal={() => setShowPlatformModal(true)}
        />
      )}

      {/* Main Navigation Bar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        favorites={favorites}
        recentTools={recentTools}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Page Workspace: padded at bottom on Android to clear Material Bottom Nav */}
      <main className={`flex-1 w-full ${isAndroid ? 'pb-24' : 'pb-8'}`}>
        {renderPage()}
      </main>

      {/* Android Material 3 Bottom Navigation Bar */}
      {isAndroid && (
        <AndroidBottomNav
          currentPage={currentPage}
          onNavigate={navigateTo}
          favoritesCount={favorites.length}
          onOpenCategories={() => setShowCategoriesSheet(true)}
          onOpenInstallModal={() => setShowInstallModal(true)}
          onOpenPlatformModal={() => setShowPlatformModal(true)}
        />
      )}

      {/* Android Floating Action Button (FAB) */}
      {isAndroid && <AndroidFloatingActionButton onNavigate={navigateTo} />}

      {/* Android Categories Bottom Sheet */}
      {isAndroid && (
        <AndroidCategoriesSheet
          isOpen={showCategoriesSheet}
          onClose={() => setShowCategoriesSheet(false)}
          onSelectCategory={(catId) => {
            navigateTo(`category:${catId}`);
          }}
        />
      )}

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* PC Workstation Bottom Status Bar */}
      {isPC && (
        <PcStatusBar
          currentPage={currentPage}
          onOpenInstallModal={() => setShowInstallModal(true)}
        />
      )}

      {/* Platform Switcher & App Install Modals */}
      <PlatformSwitcherModal
        isOpen={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
      />
      <AppInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        initialTab={isAndroid ? 'android' : 'pc'}
      />
    </div>
  );
}

export default function App() {
  return (
    <PlatformThemeProvider>
      <MainApp />
    </PlatformThemeProvider>
  );
}
