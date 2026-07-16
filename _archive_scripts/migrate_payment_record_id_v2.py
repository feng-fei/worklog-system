"""
数据库迁移脚本：将 payment_records 表的 record_id 从 NOT NULL 改为可空
在 Docker 容器内运行
"""
import sqlite3
import os

db_path = '/app/data/worklog.db'

if not os.path.exists(db_path):
    print('数据库文件不存在:', db_path)
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 检查表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_records'")
    if not cursor.fetchone():
        print('payment_records 表不存在，跳过迁移')
        conn.close()
        exit(0)
    
    # 检查当前表结构
    cursor.execute("PRAGMA table_info(payment_records)")
    columns = cursor.fetchall()
    print('当前表结构:')
    for col in columns:
        print(f'  {col[1]}: {col[2]} (notnull={col[3]})')
    
    # 找到 record_id 列
    record_id_col = None
    for col in columns:
        if col[1] == 'record_id':
            record_id_col = col
            break
    
    if record_id_col and record_id_col[3] == 0:
        print('\nrecord_id 已经是可空的，无需迁移')
        conn.close()
        exit(0)
    
    print('\n开始迁移...')
    
    # SQLite 不支持直接修改列的 not null 约束
    # 需要重建表
    cursor.execute("""
        CREATE TABLE payment_records_new (
            id INTEGER PRIMARY KEY,
            record_id INTEGER,
            customer_name VARCHAR(100) DEFAULT '',
            amount FLOAT DEFAULT 0.0,
            payment_date DATE,
            payment_method VARCHAR(20) DEFAULT 'cash',
            remark VARCHAR(500) DEFAULT '',
            created_by VARCHAR(100) DEFAULT '',
            created_at DATETIME
        )
    """)
    
    # 复制数据
    cursor.execute("""
        INSERT INTO payment_records_new 
        (id, record_id, customer_name, amount, payment_date, payment_method, remark, created_by, created_at)
        SELECT id, record_id, customer_name, amount, payment_date, payment_method, remark, created_by, created_at
        FROM payment_records
    """)
    
    # 删除旧表
    cursor.execute("DROP TABLE payment_records")
    
    # 重命名新表
    cursor.execute("ALTER TABLE payment_records_new RENAME TO payment_records")
    
    # 重建索引
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_payment_records_record_id ON payment_records(record_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_payment_records_customer_name ON payment_records(customer_name)")
    
    conn.commit()
    print('迁移完成！')
    
    # 验证
    cursor.execute("PRAGMA table_info(payment_records)")
    columns = cursor.fetchall()
    print('\n迁移后表结构:')
    for col in columns:
        print(f'  {col[1]}: {col[2]} (notnull={col[3]})')
        
except Exception as e:
    print('迁移失败:', e)
    conn.rollback()
    import traceback
    traceback.print_exc()
finally:
    conn.close()
