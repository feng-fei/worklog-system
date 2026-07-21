#!/usr/bin/env python
# -*- coding: utf-8 -*-

from backend import create_app

app = create_app()

if __name__ == '__main__':
    # 开发环境
    # app.run(host='0.0.0.0', port=5000, debug=True)
    
    # 生产环境（使用 Gunicorn 时不需要这个）
    import os
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)