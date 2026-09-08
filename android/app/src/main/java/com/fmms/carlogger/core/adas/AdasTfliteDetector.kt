package com.fmms.carlogger.core.adas

import android.content.Context
import android.content.res.AssetFileDescriptor
import android.graphics.Bitmap
import android.graphics.RectF
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.max
import kotlin.math.min

/**
 * AI Deep Learning Object Detector sử dụng TensorFlow Lite (Model: vehicle_edl0.tflite)
 * Hỗ trợ nhận diện đa phân lớp (Ô tô, Xe buýt, Xe tải, Xe máy, Xe đạp, Người đi bộ)
 */
class AdasTfliteDetector(
    private val context: Context,
    private val modelAssetPath: String = "adas/vehicle_edl0.tflite"
) {

    private var interpreter: Interpreter? = null
    private var isInitialized = false
    private var inputSize = 320
    private var isInputFloat = false

    // Output buffers
    private val maxDetections = 10
    private val outputLocations = Array(1) { Array(maxDetections) { FloatArray(4) } }
    private val outputClasses = Array(1) { FloatArray(maxDetections) }
    private val outputScores = Array(1) { FloatArray(maxDetections) }
    private val outputNumDetections = FloatArray(1)

    private var inputByteBuffer: ByteBuffer? = null
    private var intValues = IntArray(inputSize * inputSize)

    init {
        initModel()
    }

    private fun initModel() {
        try {
            val modelBuffer = loadModelFile(context, modelAssetPath)
            if (modelBuffer != null) {
                val options = Interpreter.Options().apply {
                    setNumThreads(4)
                    setCancellable(true)
                }
                interpreter = Interpreter(modelBuffer, options)
                
                val inputTensor = interpreter?.getInputTensor(0)
                if (inputTensor != null) {
                    val shape = inputTensor.shape() // [1, height, width, 3]
                    if (shape.size >= 4) {
                        inputSize = shape[1]
                    }
                    isInputFloat = inputTensor.dataType() == DataType.FLOAT32
                    intValues = IntArray(inputSize * inputSize)
                    val bytesPerChannel = if (isInputFloat) 4 else 1
                    inputByteBuffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * bytesPerChannel).apply {
                        order(ByteOrder.nativeOrder())
                    }
                }
                isInitialized = true
            }
        } catch (e: Exception) {
            e.printStackTrace()
            isInitialized = false
        }
    }

    fun isReady(): Boolean = isInitialized && interpreter != null

    /**
     * Chạy suy luận (Inference) trên Bitmap
     */
    fun detect(
        bitmap: Bitmap,
        minScoreThreshold: Float = 0.40f
    ): List<RawDetection> {
        val interp = interpreter ?: return emptyList()
        val byteBuf = inputByteBuffer ?: return emptyList()

        try {
            // Resize bitmap về kích thước đầu vào của model (320x320)
            val scaledBitmap = if (bitmap.width == inputSize && bitmap.height == inputSize) {
                bitmap
            } else {
                Bitmap.createScaledBitmap(bitmap, inputSize, inputSize, true)
            }

            // Nạp pixel vào ByteBuffer
            byteBuf.rewind()
            scaledBitmap.getPixels(intValues, 0, inputSize, 0, 0, inputSize, inputSize)
            var pixelIdx = 0

            if (isInputFloat) {
                for (i in 0 until inputSize) {
                    for (j in 0 until inputSize) {
                        val pixelValue = intValues[pixelIdx++]
                        // Normalize [0..255] -> [0f..1f]
                        byteBuf.putFloat(((pixelValue shr 16) and 0xFF) / 255.0f)
                        byteBuf.putFloat(((pixelValue shr 8) and 0xFF) / 255.0f)
                        byteBuf.putFloat((pixelValue and 0xFF) / 255.0f)
                    }
                }
            } else {
                for (i in 0 until inputSize) {
                    for (j in 0 until inputSize) {
                        val pixelValue = intValues[pixelIdx++]
                        byteBuf.put(((pixelValue shr 16) and 0xFF).toByte())
                        byteBuf.put(((pixelValue shr 8) and 0xFF).toByte())
                        byteBuf.put((pixelValue and 0xFF).toByte())
                    }
                }
            }

            if (scaledBitmap != bitmap) {
                scaledBitmap.recycle()
            }

            // Chuẩn bị map output cho TensorFlow Lite
            val outputs = mutableMapOf<Int, Any>()
            outputs[0] = outputLocations
            outputs[1] = outputClasses
            outputs[2] = outputScores
            outputs[3] = outputNumDetections

            val inputs = arrayOf<Any>(byteBuf)
            interp.runForMultipleInputsOutputs(inputs, outputs)

            val count = min(maxDetections, outputNumDetections[0].toInt())
            val results = mutableListOf<RawDetection>()

            for (i in 0 until count) {
                val score = outputScores[0][i]
                if (score >= minScoreThreshold) {
                    val ymin = max(0f, outputLocations[0][i][0])
                    val xmin = max(0f, outputLocations[0][i][1])
                    val ymax = min(1f, outputLocations[0][i][2])
                    val xmax = min(1f, outputLocations[0][i][3])
                    val classId = outputClasses[0][i].toInt()

                    val objectClass = mapClassId(classId)
                    val box = RectF(xmin, ymin, xmax, ymax)

                    results.add(
                        RawDetection(
                            box = box,
                            score = score,
                            objectClass = objectClass
                        )
                    )
                }
            }
            return results
        } catch (e: Exception) {
            e.printStackTrace()
            return emptyList()
        }
    }

    private fun mapClassId(classId: Int): DetectedObjectClass {
        return when (classId) {
            0 -> DetectedObjectClass.PEDESTRIAN
            1 -> DetectedObjectClass.BICYCLE
            2 -> DetectedObjectClass.CAR
            3 -> DetectedObjectClass.MOTORCYCLE
            5 -> DetectedObjectClass.BUS
            7 -> DetectedObjectClass.TRUCK
            else -> DetectedObjectClass.CAR
        }
    }

    private fun loadModelFile(context: Context, path: String): MappedByteBuffer? {
        return try {
            val fileDescriptor: AssetFileDescriptor = context.assets.openFd(path)
            val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
            val fileChannel = inputStream.channel
            val startOffset = fileDescriptor.startOffset
            val declaredLength = fileDescriptor.declaredLength
            fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun close() {
        try {
            interpreter?.close()
            interpreter = null
            isInitialized = false
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

/**
 * Kết quả thô từ mô hình TFLite
 */
data class RawDetection(
    val box: RectF,
    val score: Float,
    val objectClass: DetectedObjectClass
)
