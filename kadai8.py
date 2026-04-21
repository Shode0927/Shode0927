import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256  # マトリックスサイズ

# ---- サイノグラムの読み込み ----
sino = np.fromfile('kadai7.raw').reshape((N, N))

# ---- 逆投影像を格納する配列 (256×256) ----
ar = np.zeros((N, N))

# ---- 座標設定: 画像の原点を配列 [128, 128] に設定 ----
# x = j - 128,  y = i - 128
j_coords = np.arange(N) - 128        # x 座標の配列
i_coords = np.arange(N) - 128        # y 座標の配列
x_grid, y_grid = np.meshgrid(j_coords, i_coords)  # 2次元座標グリッド

# ---- 逆投影の計算: f*(x,y) = ∫₀²π g(X,θ) dθ ----
for k in range(N):
    teta = 2.0 * np.pi * k / N  # 角度 θ

    # 点(x,y) に対応する X 座標: X = x*cosθ + y*sinθ
    X = x_grid * np.cos(teta) + y_grid * np.sin(teta)

    # X をサイノグラムの配列インデックスに変換: j = X + N/2
    j_idx = np.round(X + N / 2).astype(int)

    # 配列の範囲内のピクセルのみ処理
    valid = (j_idx >= 0) & (j_idx < N)

    # 対応する投影値を逆投影像に加算
    ar[valid] += sino[k, j_idx[valid]]

# ---- 画像を表示・保存 ----
plt.figure()
plt.imshow(ar, cmap='gray')
plt.imsave('kadai8.png', ar, cmap='gray')
plt.close()
