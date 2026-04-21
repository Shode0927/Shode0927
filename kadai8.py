import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256

sino = np.fromfile('kadai7.raw').reshape((N, N))
ar = np.zeros((N, N))

# xy coordinates: origin at [128,128], so x=j-128, y=i-128
j_arr = np.arange(N) - 128
i_arr = np.arange(N) - 128
x_grid, y_grid = np.meshgrid(j_arr, i_arr)

for k in range(N):
    teta = 2.0 * np.pi * k / N
    # X-coordinate of each pixel on the projection axis at angle teta
    X = x_grid * np.cos(teta) + y_grid * np.sin(teta)
    j_idx = np.round(X + N / 2).astype(int)
    valid = (j_idx >= 0) & (j_idx < N)
    ar[valid] += sino[k, j_idx[valid]]

plt.figure()
plt.imshow(ar, cmap='gray')
plt.imsave('kadai8.png', ar, cmap='gray')
plt.close()
