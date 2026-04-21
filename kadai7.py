import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256

# 4 cylinders: (x_center, y_center, radius)
cylinders = [
    (60.0,  60.0, 24.0),
    (-60.0,  60.0, 24.0),
    (60.0, -60.0, 24.0),
    (-60.0, -60.0, 24.0),
]

sino = np.zeros((N, N))
j_arr = np.arange(N) - N // 2  # x = j - N/2

for i in range(N):
    teta = 2.0 * np.pi * i / N
    for x1, y1, r in cylinders:
        x0 = x1 * np.cos(teta) + y1 * np.sin(teta)
        diff = j_arr - x0
        mask = np.abs(diff) <= r
        sino[i, mask] += np.sqrt(r ** 2 - diff[mask] ** 2)

sino.tofile('kadai7.raw')
plt.figure()
plt.imshow(sino, cmap='gray')
plt.imsave('kadai7.png', sino, cmap='gray')
plt.close()
