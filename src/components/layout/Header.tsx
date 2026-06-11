import { useState } from 'react';
import { Image, ShieldCheck, CircleHelp, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

export default function Header() {
  const [showHelp, setShowHelp] = useState(false);
  const images = useAppStore((state) => state.images);

  const handleHelpClick = () => {
    setShowHelp(!showHelp);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16',
        'glass-card rounded-none border-t-0 border-x-0 border-b border-ink-500/30',
      )}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-mono font-bold text-lg text-ink-50 tracking-wider">
              PixForge
            </h1>
            <span className="text-xs text-ink-300">本地图片处理工具</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-success-500/10 border border-success-500/30">
          <ShieldCheck className="w-4 h-4 text-success-500" />
          <span className="text-sm font-medium text-success-500">
            100% 本地处理 · 不上传服务器
          </span>
        </div>

        <div className="flex items-center gap-3">
          {images.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-600/60 border border-ink-500/40">
              <Layers className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-medium text-ink-100">
                {images.length} 张图片
              </span>
            </div>
          )}

          <div className="relative">
            <button
              onClick={handleHelpClick}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                'bg-ink-600/60 border border-ink-500/40',
                'hover:bg-ink-600 hover:border-accent-500/50 transition-all duration-200',
                showHelp && 'border-accent-500/70 bg-ink-600',
              )}
              aria-label="帮助"
            >
              <CircleHelp className="w-5 h-5 text-ink-200" />
            </button>

            {showHelp && (
              <div
                className={cn(
                  'absolute right-0 top-full mt-2 w-72 p-4',
                  'glass-card shadow-card animate-fade-in',
                )}
              >
                <h3 className="font-semibold text-ink-50 mb-2">功能说明</h3>
                <ul className="space-y-2 text-sm text-ink-200">
                  <li>• 支持批量图片压缩、裁剪和格式转换</li>
                  <li>• 可调整亮度、对比度、饱和度等参数</li>
                  <li>• 实时预览处理前后对比效果</li>
                  <li>• 所有操作在本地浏览器完成，保护隐私</li>
                </ul>
                <button
                  onClick={() => setShowHelp(false)}
                  className="mt-4 w-full btn-secondary text-sm py-2"
                >
                  知道了
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
