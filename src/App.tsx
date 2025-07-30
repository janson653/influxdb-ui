import "./App.css";

function App() {
  const profileData = {
    "screenshot_description": {
      "left_sidebar": {
        "title": "数据库工具",
        "background_color": "#24292e",
        "text_color": "#f6f8fa",
        "search_bar": {
          "text": "Search database objects...",
          "background_color": "#3f4448",
          "text_color": "#f6f8fa"
        },
        "connections": [
          {
            "name": "InfluxDB连接1",
            "status": "connected",
            "connection_header_color": "#f6f8fa",
            "databases": [
              {
                "name": "production_db",
                "tables": [],
                "database_item_color": "#f6f8fa"
              },
              {
                "name": "customer_data",
                "tables": [
                  {"name": "customers", "table_item_color": "#f6f8fa"},
                  {"name": "orders", "table_item_color": "#f6f8fa"},
                  {"name": "products", "table_item_color": "#f6f8fa"}
                ],
                "database_item_color": "#f6f8fa"
              },
              {
                "name": "Sales_summary",
                "tables": [],
                "database_item_color": "#f6f8fa"
              },
              {
                "name": "analytics_db",
                "tables": [],
                "database_item_color": "#f6f8fa"
              }
            ]
          },
          {
            "name": "InfluxDB连接2",
            "status": "connected",
            "connection_header_color": "#f6f8fa",
            "databases": []
          }
        ]
      },
      "main_content_area": {
        "background_color": "#f6f8fa",
        "top_panel": {
          "background_color": "#e0e0e0",
          "buttons": [
            {"text": "新建连接"},
            {"text": "保存"},
            {"text": "运行 SQL", "background_color": "#28a745", "text_color": "#ffffff"}
          ],
          "tabs": [
            {
              "name": "查询 1",
              "active": true,
              "background_color": "#ffffff",
              "text_color": "#24292e"
            },
            {
              "name": "查询 2",
              "active": false,
              "background_color": "#f6f8fa",
              "text_color": "#24292e"
            }
          ],
          "query_editor": {
            "language": "SQL",
            "background_color": "#ffffff",
            "text_color": "#24292e",
            "content": [
              "SELECT * FROM customers",
              "WHERE city = '北京'",
              "AND created_at = '2023-01-01'",
              "ORDER BY last_order_date DESC;",
              "",
              "SELECT COUNT(*) AS total_customers",
              "FROM customers WHERE city = '北京';"
            ]
          }
        },
        "bottom_panel": {
          "background_color": "#f6f8fa",
          "tabs": [
            {
              "name": "结果",
              "active": true,
              "background_color": "#ffffff",
              "text_color": "#24292e"
            },
            {
              "name": "消息",
              "active": false,
              "background_color": "#f6f8fa",
              "text_color": "#24292e"
            },
            {
              "name": "统计信息",
              "active": false,
              "background_color": "#f6f8fa",
              "text_color": "#24292e"
            }
          ],
          "results_table": {
            "title": "结果 (5 条记录, 执行时间: 0.012 秒)",
            "header_background_color": "#f6f8fa",
            "header_text_color": "#24292e",
            "row_background_color": "#ffffff",
            "row_text_color": "#24292e",
            "border_color": "#d1d5da",
            "columns": [
              "ID",
              "姓名",
              "城市",
              "电话",
              "邮箱",
              "注册日期",
              "最近订单日期"
            ],
            "rows": [
              {
                "ID": "1001",
                "姓名": "张明",
                "城市": "北京",
                "电话": "138****5678",
                "邮箱": "zhang@example.com",
                "注册日期": "2022-12-12",
                "最近订单日期": "2023-11-05"
              },
              {
                "ID": "1002",
                "姓名": "李华",
                "城市": "北京",
                "电话": "139****1234",
                "邮箱": "li@example.com",
                "注册日期": "2023-01-23",
                "最近订单日期": "2023-10-18"
              },
              {
                "ID": "1003",
                "姓名": "王芳",
                "城市": "北京",
                "电话": "136****2345",
                "邮箱": "wang@example.com",
                "注册日期": "2023-02-15",
                "最近订单日期": "2023-09-22"
              },
              {
                "ID": "1004",
                "姓名": "赵伟",
                "城市": "北京",
                "电话": "135****6789",
                "邮箱": "zhao@example.com",
                "注册日期": "2023-03-08",
                "最近订单日期": "2023-08-17"
              },
              {
                "ID": "1005",
                "姓名": "刘强",
                "城市": "北京",
                "电话": "137****3456",
                "邮箱": "liu@example.com",
                "注册日期": "2023-04-19",
                "最近订单日期": "2023-07-30"
              }
            ]
          },
          "action_buttons": [
            {"text": "导出 CSV"},
            {"text": "刷新"}
          ]
        }
      },
      "right_sidebar": {
        "background_color": "#f6f8fa",
        "text_color": "#24292e",
        "table_properties": {
          "title": "customers表",
          "title_color": "#24292e",
          "table_name_display": "customers表",
          "columns_section": {
            "title": "列名",
            "section_title_color": "#24292e",
            "columns": [
              {"name": "id", "type": "INT"},
              {"name": "name", "type": "VARCHAR(50)"},
              {"name": "city", "type": "VARCHAR(50)"},
              {"name": "phone", "type": "VARCHAR(20)"},
              {"name": "email", "type": "VARCHAR(100)"},
              {"name": "created_at", "type": "DATETIME"},
              {"name": "last_order_date", "type": "DATETIME"}
            ]
          },
          "indexes_section": {
            "title": "索引",
            "section_title_color": "#24292e",
            "primary_key": {
              "name": "PRIMARY",
              "type": "主键",
              "columns": ["id"]
            },
            "other_indexes": [
              {"name": "idx_city", "columns": ["city"]},
              {"name": "idx_name", "columns": ["name"]}
            ]
          },
          "statistics_section": {
            "title": "统计信息",
            "section_title_color": "#24292e",
            "items": [
              {"label": "总记录数", "value": "10,247"},
              {"label": "数据大小", "value": "2.4 MB"},
              {"label": "索引大小", "value": "0.8 MB"},
              {"label": "最后更新", "value": "2023-11-15"}
            ]
          }
        }
      }
    }
  };

  const leftSidebar = profileData.screenshot_description.left_sidebar;
  const mainContentArea = profileData.screenshot_description.main_content_area;
  const rightSidebar = profileData.screenshot_description.right_sidebar;

  return (
    <div className="app-container">
      <div className="left-sidebar">
        <h2>{leftSidebar.title}</h2>
        <div className="search-bar-container">
          <input
            type="text"
            placeholder={leftSidebar.search_bar.text}
            style={{
              backgroundColor: leftSidebar.search_bar.background_color,
              color: leftSidebar.search_bar.text_color,
            }}
          />
        </div>
        <div className="connections-list">
          {leftSidebar.connections.map((connection, connIndex) => (
            <div key={connIndex} className="connection-item">
              <h3 style={{ color: connection.connection_header_color }}>
                {connection.name} ({connection.status})
              </h3>
              <ul className="databases-list">
                {connection.databases.map((database, dbIndex) => (
                  <li key={dbIndex} style={{ color: database.database_item_color }}>
                    {database.name}
                    {database.tables && database.tables.length > 0 && (
                      <ul className="tables-list">
                        {database.tables.map((table, tableIndex) => (
                          <li key={tableIndex} style={{ color: table.table_item_color }}>
                            {table.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="main-content-area">
        <div className="top-panel" style={{ backgroundColor: mainContentArea.top_panel.background_color }}>
          <div className="top-panel-buttons">
            {mainContentArea.top_panel.buttons.map((button, index) => (
              <button
                key={index}
                style={{
                  backgroundColor: button.background_color || 'transparent',
                  color: button.text_color || '#24292e',
                }}
              >
                {button.text}
              </button>
            ))}
          </div>
          <div className="top-panel-tabs">
            {mainContentArea.top_panel.tabs.map((tab, index) => (
              <div
                key={index}
                className={`tab-item ${tab.active ? 'active' : ''}`}
                style={{
                  backgroundColor: tab.background_color,
                  color: tab.text_color,
                }}
              >
                {tab.name}
              </div>
            ))}
          </div>
          <div className="query-editor" style={{ backgroundColor: mainContentArea.top_panel.query_editor.background_color }}>
            <textarea
              readOnly
              style={{
                backgroundColor: mainContentArea.top_panel.query_editor.background_color,
                color: mainContentArea.top_panel.query_editor.text_color,
              }}
              value={mainContentArea.top_panel.query_editor.content.join('\n')}
            />
          </div>
        </div>
        <div className="bottom-panel" style={{ backgroundColor: mainContentArea.bottom_panel.background_color }}>
          <div className="bottom-panel-tabs">
            {mainContentArea.bottom_panel.tabs.map((tab, index) => (
              <div
                key={index}
                className={`tab-item ${tab.active ? 'active' : ''}`}
                style={{
                  backgroundColor: tab.background_color,
                  color: tab.text_color,
                }}
              >
                {tab.name}
              </div>
            ))}
          </div>
          <div className="results-table-container">
            <h3>{mainContentArea.bottom_panel.results_table.title}</h3>
            <table className="results-table">
              <thead>
                <tr style={{ backgroundColor: mainContentArea.bottom_panel.results_table.header_background_color, color: mainContentArea.bottom_panel.results_table.header_text_color }}>
                  {mainContentArea.bottom_panel.results_table.columns.map((column, index) => (
                    <th key={index}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mainContentArea.bottom_panel.results_table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ backgroundColor: mainContentArea.bottom_panel.results_table.row_background_color, color: mainContentArea.bottom_panel.results_table.row_text_color }}>
                    {mainContentArea.bottom_panel.results_table.columns.map((column, colIndex) => (
                      <td key={colIndex}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="action-buttons">
            {mainContentArea.bottom_panel.action_buttons.map((button, index) => (
              <button key={index}>{button.text}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="right-sidebar">
        <h3 style={{ color: rightSidebar.table_properties.title_color }}>{rightSidebar.table_properties.title}</h3>
        <p><strong>表名:</strong> {rightSidebar.table_properties.table_name_display}</p>

        <h4 className="section-title" style={{ color: rightSidebar.table_properties.columns_section.section_title_color }}>{rightSidebar.table_properties.columns_section.title}</h4>
        <ul>
          {rightSidebar.table_properties.columns_section.columns.map((column, index) => (
            <li key={index}>{column.name} ({column.type})</li>
          ))}
        </ul>

        <h4 className="section-title" style={{ color: rightSidebar.table_properties.indexes_section.section_title_color }}>{rightSidebar.table_properties.indexes_section.title}</h4>
        <ul>
          <li><strong>{rightSidebar.table_properties.indexes_section.primary_key.name}</strong> ({rightSidebar.table_properties.indexes_section.primary_key.type}): {rightSidebar.table_properties.indexes_section.primary_key.columns.join(', ')}</li>
          {rightSidebar.table_properties.indexes_section.other_indexes.map((index, idx) => (
            <li key={idx}><strong>{index.name}</strong>: {index.columns.join(', ')}</li>
          ))}
        </ul>

        <h4 className="section-title" style={{ color: rightSidebar.table_properties.statistics_section.section_title_color }}>{rightSidebar.table_properties.statistics_section.title}</h4>
        <ul>
          {rightSidebar.table_properties.statistics_section.items.map((item, index) => (
            <li key={index}><strong>{item.label}:</strong> {item.value}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;