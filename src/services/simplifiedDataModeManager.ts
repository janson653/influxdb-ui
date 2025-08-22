/**
 * 简化的数据模式管理器
 * 只保留基本的模式切换功能，移除复杂的统计和拦截器
 */

export type DataMode = 'demo' | 'real';

export interface DataModeState {
  mode: DataMode;
  lastSwitchTime: string;
}

class SimplifiedDataModeManager {
  private static readonly STORAGE_KEY = 'influxdb_ui_data_mode';
  private currentMode: DataMode = 'demo';
  private listeners: Array<(mode: DataMode) => void> = [];

  constructor() {
    this.initializeMode();
  }

  /**
   * 初始化数据模式
   */
  private initializeMode(): void {
    try {
      const stored = localStorage.getItem(SimplifiedDataModeManager.STORAGE_KEY);
      if (stored) {
        const state: DataModeState = JSON.parse(stored);
        this.currentMode = state.mode;
        console.log(`🔧 简化数据模式管理器初始化: ${this.currentMode} 模式`);
      } else {
        console.log('🔧 简化数据模式管理器初始化: 默认演示模式');
        this.saveMode();
      }
    } catch (error) {
      console.warn('⚠️ 读取数据模式配置失败，使用默认演示模式:', error);
      this.currentMode = 'demo';
      this.saveMode();
    }
  }

  /**
   * 获取当前数据模式
   */
  getCurrentMode(): DataMode {
    return this.currentMode;
  }

  /**
   * 检查是否为演示模式
   */
  isDemoMode(): boolean {
    return this.currentMode === 'demo';
  }

  /**
   * 切换数据模式
   */
  switchMode(mode: DataMode): void {
    if (this.currentMode !== mode) {
      console.log(`🔄 切换数据模式: ${this.currentMode} → ${mode}`);
      this.currentMode = mode;
      this.saveMode();
      this.notifyListeners();
    }
  }

  /**
   * 添加模式变化监听器
   */
  addModeListener(listener: (mode: DataMode) => void): () => void {
    this.listeners.push(listener);
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 保存模式到本地存储
   */
  private saveMode(): void {
    const state: DataModeState = {
      mode: this.currentMode,
      lastSwitchTime: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(SimplifiedDataModeManager.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ 保存数据模式配置失败:', error);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentMode);
      } catch (error) {
        console.error('❌ 模式监听器执行失败:', error);
      }
    });
  }

  /**
   * 获取模式状态（简化版本）
   */
  getModeState(): DataModeState {
    return {
      mode: this.currentMode,
      lastSwitchTime: new Date().toISOString(),
    };
  }

  /**
   * 重置为默认模式
   */
  resetToDefault(): void {
    this.switchMode('demo');
  }
}

// 导出简化后的单例实例
export const simplifiedDataModeManager = new SimplifiedDataModeManager();