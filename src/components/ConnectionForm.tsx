import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Switch } from 'antd';
import { DatabaseOutlined, LinkOutlined } from '@ant-design/icons';
import { InfluxDBConnection } from '../types/influxdb';
import { influxDBService } from '../services/influxdb';

interface ConnectionFormProps {
  onConnectionCreated: (connection: InfluxDBConnection) => void;
  onCancel: () => void;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ onConnectionCreated, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [useAuth, setUseAuth] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const connection: InfluxDBConnection = {
        id: Date.now().toString(),
        name: values.name,
        url: values.url,
        username: useAuth ? values.username : undefined,
        password: useAuth ? values.password : undefined,
        database: values.database,
        status: 'disconnected'
      };

      // 测试连接
      const isConnected = await influxDBService.testConnection(connection);
      
      if (isConnected) {
        connection.status = 'connected';
        message.success('连接成功！');
        onConnectionCreated(connection);
      } else {
        connection.status = 'error';
        connection.error = '连接失败，请检查配置';
        message.error('连接失败，请检查配置');
      }
    } catch (error) {
      message.error('连接测试失败');
      console.error('连接错误:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="新建 InfluxDB 连接" style={{ width: 500 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          url: 'http://localhost:8086',
          database: 'test'
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

        <Form.Item label="启用认证">
          <Switch checked={useAuth} onChange={setUseAuth} />
        </Form.Item>

        {useAuth && (
          <>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="admin" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="password" />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            测试并保存
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ConnectionForm; 