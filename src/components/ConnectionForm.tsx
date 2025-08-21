import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Switch } from 'antd';
import { DatabaseOutlined, LinkOutlined } from '@ant-design/icons';
import { InfluxDBConnection } from '../types/influxdb';
import { dataService } from '../services/dataService';

interface ConnectionFormProps {
  editingConnection?: InfluxDBConnection | null;
  onConnectionCreated: (connection: InfluxDBConnection) => void;
  onCancel: () => void;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ editingConnection, onConnectionCreated, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [useAuth, setUseAuth] = useState(true);

  // 当编辑连接时，设置表单初始值
  useEffect(() => {
    if (editingConnection) {
      form.setFieldsValue({
        name: editingConnection.name,
        url: editingConnection.url,
        database: editingConnection.database,
        username: editingConnection.username,
        password: editingConnection.password
      });
      setUseAuth(!!editingConnection.username);
    } else {
      form.resetFields();
      setUseAuth(true);
    }
  }, [editingConnection, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const connection: InfluxDBConnection = {
        id: editingConnection?.id || Date.now().toString(),
        name: values.name,
        url: values.url,
        username: useAuth ? values.username : undefined,
        password: useAuth ? values.password : undefined,
        database: values.database,
        status: 'disconnected'
      };

      // 测试连接
      const isConnected = await dataService.testConnection(connection);
      
      if (isConnected) {
        connection.status = 'connected';
        message.success(editingConnection ? '连接更新成功！' : '连接创建成功！');
        onConnectionCreated(connection);
      } else {
        connection.status = 'error';
        connection.error = '连接失败，请检查配置';
        message.error('连接失败，请检查服务器地址、认证信息和数据库名称');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '连接测试失败';
      message.error(`连接测试失败: ${errorMessage}`);
      console.error('连接错误:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={editingConnection ? "编辑 InfluxDB 连接" : "新建 InfluxDB 连接"} style={{ width: 500 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          url: 'http://localhost:8086',
          database: 'test',
          username: 'admin',
          password: 'password'
        }}
      >
        <Form.Item
          name="name"
          label="连接名称"
          rules={[{ required: true, message: '请输入连接名称' }]}
        >
          <Input placeholder="例如：本地 InfluxDB" prefix={<LinkOutlined />} />
        </Form.Item>

        <Form.Item
          name="url"
          label="服务器地址"
          rules={[{ required: true, message: '请输入服务器地址' }]}
        >
          <Input placeholder="http://localhost:8086" />
        </Form.Item>

        <Form.Item
          name="database"
          label="数据库名称"
          rules={[{ required: true, message: '请输入数据库名称' }]}
        >
          <Input placeholder="test" prefix={<DatabaseOutlined />} />
        </Form.Item>

        <Form.Item 
          label="数据库认证"
          help="如果数据库需要用户名密码认证，请启用此项"
        >
          <Switch 
            checked={useAuth} 
            onChange={setUseAuth}
            checkedChildren="需要认证"
            unCheckedChildren="无需认证"
          />
        </Form.Item>

        {useAuth && (
          <>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" prefix={<DatabaseOutlined />} />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            {editingConnection ? '更新连接' : '测试并保存'}
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ConnectionForm; 