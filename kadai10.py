import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256

j_arr = np.arange(N) - 128
i_arr = np.arange(N) - 128
x_grid, y_grid = np.meshgrid(j_arr, i_arr)

def back_project(sinogram):
    ar = np.zeros((N, N))
    for k in range(N):
        teta = 2.0 * np.pi * k / N
        X = x_grid * np.cos(teta) + y_grid * np.sin(teta)
        j_idx = np.round(X + N / 2).astype(int)
        valid = (j_idx >= 0) & (j_idx < N)
        ar[valid] += sinogram[k, j_idx[valid]]
    return ar

# Filtered back projection using Shepp-Logan filtered sinogram (kadai9)
gm = np.fromfile('kadai9.raw').reshape((N, N))
ar_fbp = back_project(gm)

# Simple back projection using original sinogram (kadai8) for comparison
sino = np.fromfile('kadai7.raw').reshape((N, N))
ar_bp = back_project(sino)

# Comparison figure
fig, axes = plt.subplots(1, 2, figsize=(10, 5))
axes[0].imshow(ar_bp, cmap='gray')
axes[0].set_title('Back Projection (kadai8)')
axes[1].imshow(ar_fbp, cmap='gray')
axes[1].set_title('Filtered Back Projection (kadai10)')
plt.tight_layout()
plt.savefig('kadai10.png', dpi=100)
plt.close()
