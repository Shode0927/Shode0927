import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256  # マトリックスサイズ

# ---- サイノグラムの読み込み ----
sino = np.fromfile('kadai7.raw').reshape((N, N))

# ---- Shepp-Logan コンボリューションカーネルの作成 ----
# h(m) = 1 / (1 - 4m²)  (m = 0, ±1, ±2, ...)
# カーネルの中心は配列の N 番目 (h[N] = h(0))
h = np.zeros(N * 2)
for i in range(N * 2):
    m = i - N  # m = ..., -2, -1, 0, 1, 2, ...
    h[i] = 10.0 / (1.0 - 4.0 * m * m)

# ---- 各投影にコンボリューションを適用 ----
# 教科書の式: gm[j] = Σ_{k=0}^{N-1} sino[k] * h[j-k+N]
# np.convolve(sino_row, h) の N〜2N-1 番目の要素がこれに一致する
gm = np.zeros((N, N))
for i in range(N):
    full     = np.convolve(sino[i, :], h)  # 完全なコンボリューション結果
    gm[i, :] = full[N : 2*N]              # j=0〜N-1 に対応する部分を取り出す

# ---- raw ファイルに保存 ----
gm.tofile('kadai9.raw')

# ---- 画像を表示・保存 ----
plt.figure()
plt.imshow(gm, cmap='gray')
plt.imsave('kadai9.png', gm, cmap='gray')
plt.close()
