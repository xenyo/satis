<?php

/*
 * This file is part of Satis.
 *
 * (c) Jordi Boggiano <j.boggiano@seld.be>
 *     Nils Adermann <naderman@naderman.de>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Composer\Satis\Builder;

use Symfony\Component\Console\Input\InputInterface;
use Composer\Factory;
use Composer\IO\ConsoleIO;

/**
 * @author James Hautot <james@rezo.net>
 */
class DownloadsBuilder extends Builder
{
    /**
     * @param array          $packages
     * @param InputInterface $input
     * @param bool           $skipErrors If true, any exception while dumping a package will be ignored.
     */
    public function dump(array $packages, InputInterface  $input, $skipErrors, $helperSet)
    {
        if (isset($this->config['archive']['absolute-directory'])) {
            $directory = $this->config['archive']['absolute-directory'];
        } else {
            $directory = sprintf('%s/%s', $this->outputDir, $this->config['archive']['directory']);
        }

        $this->output->writeln(sprintf("<info>Creating local downloads in '%s'</info>", $directory));

        $format = isset($this->config['archive']['format']) ? $this->config['archive']['format'] : 'zip';
        $endpoint = isset($this->config['archive']['prefix-url']) ? $this->config['archive']['prefix-url'] : $this->config['homepage'];
        $skipDev = isset($this->config['archive']['skip-dev']) ? (bool) $this->config['archive']['skip-dev'] : false;
        $whitelist = isset($this->config['archive']['whitelist']) ? (array) $this->config['archive']['whitelist'] : array();
        $blacklist = isset($this->config['archive']['blacklist']) ? (array) $this->config['archive']['blacklist'] : array();

        $includeArchiveChecksum = isset($this->config['archive']['checksum']) ? (bool) $this->config['archive']['checksum'] : true;

        $composerConfig = Factory::createConfig();
        $factory = new Factory();
        $io = new ConsoleIO($input, $this->output, $helperSet);
        $io->loadConfiguration($composerConfig);

        /* @var \Composer\Downloader\DownloadManager $downloadManager */
        $downloadManager = $factory->createDownloadManager($io, $composerConfig);

        /* @var \Composer\Package\Archiver\ArchiveManager $archiveManager */
        $archiveManager = $factory->createArchiveManager($composerConfig, $downloadManager);

        $archiveManager->setOverwriteFiles(false);

        shuffle($packages);
        /* @var \Composer\Package\CompletePackage $package */
        foreach ($packages as $package) {
            if ('metapackage' === $package->getType()) {
                continue;
            }

            $name = $package->getName();

            if (true === $skipDev && true === $package->isDev()) {
                $this->output->writeln(sprintf("<info>Skipping '%s' (is dev)</info>", $name));
                continue;
            }

            $names = $package->getNames();
            if ($whitelist && !array_intersect($whitelist, $names)) {
                $this->output->writeln(sprintf("<info>Skipping '%s' (is not in whitelist)</info>", $name));
                continue;
            }

            if ($blacklist && array_intersect($blacklist, $names)) {
                $this->output->writeln(sprintf("<info>Skipping '%s' (is in blacklist)</info>", $name));
                continue;
            }

            $this->output->writeln(sprintf("<info>Dumping '%s'.</info>", $name));

            try {
                if ('pear-library' === $package->getType()) {
                    // PEAR packages are archives already
                    $filesystem = new Filesystem();
                    $packageName = $archiveManager->getPackageFilename($package);
                    $path =
                        realpath($directory).'/'.$packageName.'.'.
                        pathinfo($package->getDistUrl(), PATHINFO_EXTENSION);
                    if (!file_exists($path)) {
                        $downloadDir = sys_get_temp_dir().'/composer_archiver/'.$packageName;
                        $filesystem->ensureDirectoryExists($downloadDir);
                        $downloadManager->download($package, $downloadDir, false);
                        $filesystem->ensureDirectoryExists($directory);
                        $filesystem->rename($downloadDir.'/'.pathinfo($package->getDistUrl(), PATHINFO_BASENAME), $path);
                        $filesystem->removeDirectory($downloadDir);
                    }
                    // Set archive format to `file` to tell composer to download it as is
                    $archiveFormat = 'file';
                } else {
                    $path = $archiveManager->archive($package, $format, $directory);
                    $archiveFormat = $format;
                }
                $archive = basename($path);
                $distUrl = sprintf('%s/%s/%s', $endpoint, $this->config['archive']['directory'], $archive);
                $package->setDistType($archiveFormat);
                $package->setDistUrl($distUrl);

                if ($includeArchiveChecksum) {
                    $package->setDistSha1Checksum(hash_file('sha1', $path));
                }

                $package->setDistReference($package->getSourceReference());
            } catch (\Exception $exception) {
                if (!$skipErrors) {
                    throw $exception;
                }
                $this->output->writeln(sprintf("<error>Skipping Exception '%s'.</error>", $exception->getMessage()));
            }
        }
    }
}
