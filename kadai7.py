import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256  # マトリックスサイズ

# ---- 4本の円柱の定義: (x中心, y中心, 半径) ----
cylinders = [
    ( 60.0,  60.0, 24.0),
    (-60.0,  60.0, 24.0),
    ( 60.0, -60.0, 24.0),
    (-60.0, -60.0, 24.0),
]

# ---- サイノグラム配列の初期化 ----
sino = np.zeros((N, N))  # 行: 角度θ, 列: X座標

# ---- サイノグラムの計算 ----
for i in range(N):
    teta = 2.0 * np.pi * i / N  # 回転角 θ (0 〜 2π)

    # 4本の円柱それぞれの投影を足し合わせる (投影は各分布の加算)
    for x1, y1, r in cylinders:
        # 角度θ における円の中心の X 座標: X = x1*cosθ + y1*sinθ
        x0 = x1 * np.cos(teta) + y1 * np.sin(teta)

        for j in range(N):
            x = j - N // 2  # 配列インデックス → 座標 (原点を N/2 に設定)
            if np.abs(x - x0) <= r:
                # 円の投影は円: 弦の長さ = √(r² - (x-x0)²)
                sino[i, j] += np.sqrt(r**2 - (x - x0)**2)

# ---- raw ファイルに保存 ----
sino.tofile('kadai7.raw')

# ---- 画像を表示・保存 ----
plt.figure()
plt.imshow(sino, cmap='gray')
plt.imsave('kadai7.png', sino, cmap='gray')
plt.close()
