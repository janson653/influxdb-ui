/**
 * 数据模式管理器
 * 负责管理演示模式和真实数据模式的切换
 */

export type DataMode = 'demo' | 'real';

export interface DataModeState {
  mode: DataMode;
  lastSwitchTime: string;
  sessionCount: number;
}

class DataModeManager {
  private static readonly STORAGE_KEY = 'influxdb_ui_data_mode';
  private currentMode: DataMode = 'demo';
  private listeners: Array<(mode: DataMode) => void> = [];
  private apiCallInterceptors: Array<() => void> = [];

  constructor() {
    this.initializeMode();
  }

  /**
   * 初始化数据模式
   */
  private initializeMode(): void {
    try {
      const stored = localStorage.getItem(DataModeManager.STORAGE_KEY);
      if (stored) {
        const state: DataModeState = JSON.parse(stored);
        this.currentMode = state.mode;
        console.log(`🔧 数据模式管理器初始化: ${this.currentMode} 模式`);
      } else {
        console.log('🔧 数据模式管理器初始化: 默认演示模式');
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
   * 切换数据模式
   */
  switchMode(mode: DataMode): void {
    if (this.currentMode === mode) {
      console.log(`📝 数据模式已经是 ${mode} 模式，无需切换`);
      return;
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;
    this.saveMode();
    
    console.log(`🔄 数据模式切换: ${previousMode} → ${mode}`);
    
    // 执行API调用拦截器（清理缓存、重置状态等）
    this.executeApiCallInterceptors();
    
    // 通知所有监听器
    this.notifyListeners(mode);
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
   * 通知所有监听器
   */
  private notifyListeners(mode: DataMode): void {
    this.listeners.forEach(listener => {
      try {
        listener(mode);
      } catch (error) {
        console.error('❌ 数据模式监听器执行失败:', error);
      }
    });
  }

  /**
   * 保存当前模式到本地存储
   */
  private saveMode(): void {
    try {
      const state: DataModeState = {
        mode: this.currentMode,
        lastSwitchTime: new Date().toISOString(),
        sessionCount: this.getSessionCount() + 1,
      };
      
      localStorage.setItem(DataModeManager.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ 保存数据模式配置失败:', error);
    }
  }

  /**
   * 获取会话计数
   */
  private getSessionCount(): number {
    try {
      const stored = localStorage.getItem(DataModeManager.STORAGE_KEY);
      if (stored) {
        const state: DataModeState = JSON.parse(stored);
        return state.sessionCount || 0;
      }
    } catch (error) {
      console.warn('⚠️ 读取会话计数失败:', error);
    }
    return 0;
  }

  /**
   * 获取模式统计信息
   */
  getModeStats(): DataModeState | null {
    try {
      const stored = localStorage.getItem(DataModeManager.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('⚠️ 读取模式统计失败:', error);
    }
    return null;
  }

  /**
   * 检查是否为演示模式
   */
  isDemoMode(): boolean {
    return this.currentMode === 'demo';
  }

  /**
   * 检查是否为真实数据模式
   */
  isRealMode(): boolean {
    return this.currentMode === 'real';
  }

  /**
   * 重置为默认模式
   */
  resetToDefault(): void {
    this.switchMode('demo');
  }

  /**
   * 添加API调用拦截器
   */
  addApiCallInterceptor(interceptor: () => void): () => void {
    this.apiCallInterceptors.push(interceptor);
    
    // 返回移除拦截器的函数
    return () => {
      const index = this.apiCallInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.apiCallInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * 执行所有API调用拦截器
   */
  private executeApiCallInterceptors(): void {
    this.apiCallInterceptors.forEach(interceptor => {
      try {
        interceptor();
      } catch (error) {
        console.error('❌ API调用拦截器执行失败:', error);
      }
    });
  }

  /**
   * 验证当前是否允许真实数据API调用
   */
  validateRealDataApiCall(apiName: string): boolean {
    if (this.currentMode === 'demo') {
      console.warn(`🚫 演示模式下禁止调用真实数据API: ${apiName}`);
      return false;
    }
    return true;
  }

  /**
   * 强制使用演示数据（开发测试用）
   */
  forceDemoMode(): boolean {
    if (this.currentMode !== 'demo') {
      console.warn('🎭 强制切换到演示模式');
      this.switchMode('demo');
      return true;
    }
    return false;
  }
}

// 导出单例实例
export const dataModeManager = new DataModeManager();

