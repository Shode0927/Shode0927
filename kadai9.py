import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

N = 256

sino = np.fromfile('kadai7.raw').reshape((N, N))

# Shepp-Logan convolution kernel: h(m) = 1/(1-4m^2), center at index N
h = np.zeros(N * 2)
for i in range(N * 2):
    a = i - N
    h[i] = 10.0 / (1.0 - 4.0 * a * a)

# Apply convolution to each row (each angle) of the sinogram:
#   gm[j] = sum_{k=0}^{N-1} sino[k] * h[j-k+N]
#         = np.convolve(sino_row, h)[j+N]
# so gm = full_convolution[N : 2N]
gm = np.zeros((N, N))
for i in range(N):
    full = np.convolve(sino[i, :], h)
    gm[i, :] = full[N:2 * N]

gm.tofile('kadai9.raw')
plt.figure()
plt.imshow(gm, cmap='gray')
plt.imsave('kadai9.png', gm, cmap='gray')
plt.close()
