import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256  # マトリックスサイズ

# ---- 座標グリッドの設定: 原点を配列 [128, 128] に設定 ----
# x = j - 128,  y = i - 128
j_coords = np.arange(N) - 128
i_coords = np.arange(N) - 128
x_grid, y_grid = np.meshgrid(j_coords, i_coords)

# ---- 逆投影関数 ----
def back_projection(sinogram):
    ar = np.zeros((N, N))
    for k in range(N):
        teta = 2.0 * np.pi * k / N  # 角度 θ

        # 点(x,y) に対応する X 座標: X = x*cosθ + y*sinθ
        X = x_grid * np.cos(teta) + y_grid * np.sin(teta)

        # X をサイノグラムの配列インデックスに変換: j = X + N/2
        j_idx = np.round(X + N / 2).astype(int)

        # 配列の範囲内のピクセルのみ処理
        valid = (j_idx >= 0) & (j_idx < N)

        # 対応する投影値を逆投影像に加算
        ar[valid] += sinogram[k, j_idx[valid]]
    return ar

# ---- フィルタ補正逆投影 (kadai9 のフィルタ済みサイノグラムを使用) ----
gm     = np.fromfile('kadai9.raw').reshape((N, N))
ar_fbp = back_projection(gm)

# ---- 単純逆投影 (kadai8 と同じ、比較用) ----
sino  = np.fromfile('kadai7.raw').reshape((N, N))
ar_bp = back_projection(sino)

# ---- 2つの結果を並べて比較・保存 ----
fig, axes = plt.subplots(1, 2, figsize=(10, 5))
axes[0].imshow(ar_bp,  cmap='gray')
axes[0].set_title('Back Projection (kadai8)')
axes[1].imshow(ar_fbp, cmap='gray')
axes[1].set_title('Filtered Back Projection (kadai10)')
plt.tight_layout()
plt.savefig('kadai10.png', dpi=100)
plt.close()
