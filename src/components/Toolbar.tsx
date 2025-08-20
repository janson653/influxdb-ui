import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  SaveOutlined, 
  PlayCircleOutlined, 
  DownloadOutlined, 
  ReloadOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import './Toolbar.css';

interface ToolbarProps {
  onNewConnection: () => void;
  onSaveQuery: () => void;
  onExecuteQuery: () => void;
  onExportResults: () => void;
  onRefreshResults: () => void;
  onOpenQuery: () => void;
  canSaveQuery?: boolean;
  canExecuteQuery?: boolean;
  canExportResults?: boolean;
  canRefreshResults?: boolean;
  loading?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onNewConnection,
  onSaveQuery,
  onExecuteQuery,
  onExportResults,
  onRefreshResults,
  onOpenQuery,
  canSaveQuery = false,
  canExecuteQuery = false,
  canExportResults = false,
  canRefreshResults = false,
  loading = false,
}) => {
  return (
    <div className="toolbar">
      <Space>
        {/* 连接管理按钮 */}
        <Tooltip title="新建数据库连接">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onNewConnection}
            className="toolbar-btn toolbar-btn-primary"
          >
            新建连接
          </Button>
        </Tooltip>

        {/* 查询管理按钮 */}
        <Tooltip title="打开已保存的查询">
          <Button
            icon={<FolderOpenOutlined />}
            onClick={onOpenQuery}
            className="toolbar-btn"
          >
            打开查询
          </Button>
        </Tooltip>

        <Tooltip title="保存当前查询">
          <Button
            icon={<SaveOutlined />}
            onClick={onSaveQuery}
            disabled={!canSaveQuery}
            className="toolbar-btn"
          >
            保存查询
          </Button>
        </Tooltip>

        <div className="toolbar-divider" />

        {/* 查询执行按钮 */}
        <Tooltip title="执行查询 (Ctrl+Enter)">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onExecuteQuery}
            disabled={!canExecuteQuery}
            loading={loading}
            className="toolbar-btn toolbar-btn-execute"
          >
            运行 SQL
          </Button>
        </Tooltip>

        <div className="toolbar-divider" />

        {/* 结果操作按钮 */}
        <Tooltip title="导出查询结果为 CSV">
          <Button
            icon={<DownloadOutlined />}
            onClick={onExportResults}
            disabled={!canExportResults}
            className="toolbar-btn"
          >
            导出 CSV
          </Button>
        </Tooltip>

        <Tooltip title="刷新查询结果">
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefreshResults}
            disabled={!canRefreshResults}
            className="toolbar-btn"
          >
            刷新
          </Button>
        </Tooltip>
      </Space>

      {/* 工具栏右侧状态信息 */}
      <div className="toolbar-status">
        <span className="toolbar-status-text">
          {loading ? '正在执行查询...' : '就绪'}
        </span>
      </div>
    </div>
  );
};

export default Toolbar;